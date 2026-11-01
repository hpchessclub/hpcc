import {NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {getCurrentAdmin} from '@/lib/auth';
import {createSupabaseServiceClient} from '@/lib/supabase/service';
import {withdrawalRpc,withdrawalError,prepareWithdrawal,verifyFullStripeRefund} from '@/lib/withdrawals';
export async function POST(req:Request){
 const admin=await getCurrentAdmin();if(!admin||!['admin','super_admin'].includes(admin.profile.role))return NextResponse.json({error:'Admin or Super Admin required.'},{status:403});
 try{
  if(!req.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new Error('JSON request required.');
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('Request origin does not match this website.');
  const body=await req.json();const {id,action,note}=body;
  if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Select a valid registration or withdrawal.');
  if(!['withdraw','manual','verify_stripe'].includes(action)||typeof note!=='string'||note.trim().length<3||note.length>2000)throw new Error('Choose an action and enter a reason/review note (3–2000 characters).');
  const s=createSupabaseServiceClient();let saved:any;
  if(action==='withdraw'){
   if(body.policy_reviewed!==true)throw new Error('Review the applicable cancellation/refund policy before withdrawing.');
   if(typeof body.refund_requested!=='boolean')throw new Error('Choose whether a refund review is requested.');
   // Probe setup before expiring a checkout. This read does not alter production records.
   const setup=await s.from('hpcc_tournament_withdrawals').select('id,registration_id,refund_due_cents').eq('registration_id',id).maybeSingle();if(setup.error)throw new Error(withdrawalError(setup.error));
   if(setup.data)return NextResponse.json({ok:true,message:'This entry has already been withdrawn. Open Withdrawals & refunds to review it.'});
   const {data:entry,error}=await s.from('tournament_registrations').select('*').eq('id',id).single();if(error||!entry)throw new Error('Registration not found.');
   await prepareWithdrawal(entry);
   saved=await withdrawalRpc(s,'hpcc_withdraw_v2',{p_registration:id,p_actor:admin.user.id,p_reason:note.trim(),p_refund:body.refund_requested,p_policy_reviewed:body.policy_reviewed,p_version:entry.updated_at||null});
  }else{
   const {data:w,error}=await s.from('hpcc_tournament_withdrawals').select('*').eq('id',id).single();if(error)throw new Error(withdrawalError(error));if(!w)throw new Error('Withdrawal not found.');
   const {data:entry,error:entryError}=await s.from('tournament_registrations').select('*').eq('id',w.registration_id).single();if(entryError||!entry)throw new Error('Registration not found.');
   if(action==='verify_stripe')saved=await verifyFullStripeRefund(s,entry,w,admin.user.id,note.trim(),body.acknowledged);
   else{
    if(body.acknowledged!==true)throw new Error('Confirm the full fee has already been returned outside this website.');
    saved=await withdrawalRpc(s,'hpcc_complete_refund_v2',{p_id:id,p_actor:admin.user.id,p_method:body.method,p_note:note.trim(),p_reference:body.reference,p_full:true,p_evidence:null});
   }
  }
  revalidatePath('/club-admin','layout');revalidatePath('/tournaments','layout');revalidatePath('/');
  return NextResponse.json({ok:true,status:saved.status,message:action==='withdraw'?'Entry withdrawn and removed from confirmed lists. History retained; any refund still needs review.':saved.status==='completed'?'Refund verified/recorded. Registration remains withdrawn and history is retained.':saved.status==='pending'?'Full refund remains Pending. Issue the refund in Stripe or return the bank/cash payment outside HPCC, then verify completion.':'Refund decision saved. The player remains withdrawn.'});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save withdrawal.'},{status:400});}
}

export async function GET(req:Request){
 const admin=await getCurrentAdmin();if(!admin||!['admin','super_admin'].includes(admin.profile.role))return NextResponse.json({error:'Admin or Super Admin required.'},{status:403});
 try{const id=new URL(req.url).searchParams.get('id');if(!id)throw Error('Select a registration.');const s=createSupabaseServiceClient();
 const {data:r,error}=await s.from('tournament_registrations').select('*,tournaments(registration_policy)').eq('id',id).single();if(error||!r)throw Error('Registration not found.');
 const {data:logs,error:policyError}=await s.from('audit_logs').select('summary').eq('entity_id',id).eq('action','registration_policy_accepted').order('created_at',{ascending:false}).limit(1);
 if(policyError)throw Error('The accepted policy could not be read. Please retry before making a refund decision.');
 const snapshot=r.consent_snapshot?.policy||logs?.[0]?.summary?.policy;
 const {data:w,error:we}=await s.from('hpcc_tournament_withdrawals').select('id,status,refund_due_cents,refund_reference,reason,registration_snapshot').eq('registration_id',id).maybeSingle();if(we)throw Error(withdrawalError(we));
 const accepted=w?.registration_snapshot?.accepted_policy_snapshot?.policy||w?.registration_snapshot?.consent_snapshot?.policy||snapshot;
 const originalEventPolicy=w?.registration_snapshot?.event_policy_at_withdrawal;
 const safeW=w?{id:w.id,status:w.status,refund_due_cents:w.refund_due_cents,refund_reference:w.refund_reference,reason:w.reason}:null;
 return NextResponse.json({policy:accepted||originalEventPolicy||r.tournaments?.registration_policy||'No policy text recorded. Review the original event arrangements with the club before deciding.',policy_source:accepted?'Accepted at registration':originalEventPolicy?'Event policy reviewed at withdrawal':'Current event policy / original arrangements',paid:r.payment_status==='paid',fee:r.entry_fee_cents,stripe:!!(r.stripe_checkout_session_id||r.stripe_payment_intent_id),withdrawal:safeW},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read policy.'},{status:400});}
}
