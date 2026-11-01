import {NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {getCurrentAdmin} from '@/lib/auth';
import {createSupabaseServiceClient} from '@/lib/supabase/service';
import {withdrawalRpc,withdrawalError,prepareWithdrawal,processStripeWithdrawal,refundAmount} from '@/lib/withdrawals';
export async function POST(req:Request){
 const admin=await getCurrentAdmin();if(!admin||!['admin','super_admin'].includes(admin.profile.role))return NextResponse.json({error:'Admin or Super Admin required.'},{status:403});
 try{
  if(!req.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new Error('JSON request required.');
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('Request origin does not match this website.');
  const body=await req.json();const {id,action,note}=body;
  if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Select a valid registration or withdrawal.');
  if(!['withdraw','decline','manual','stripe'].includes(action)||typeof note!=='string'||note.trim().length<3||note.length>2000)throw new Error('Choose an action and enter a reason/review note (3–2000 characters).');
  const s=createSupabaseServiceClient();let saved:any;
  if(action==='withdraw'){
   if(typeof body.refund_requested!=='boolean')throw new Error('Choose whether a refund review is requested.');
   // Probe setup before expiring a checkout. This read does not alter production records.
   const setup=await s.from('hpcc_tournament_withdrawals').select('id,registration_id').eq('registration_id',id).maybeSingle();if(setup.error)throw new Error(withdrawalError(setup.error));
   if(setup.data)return NextResponse.json({ok:true,message:'This entry has already been withdrawn. Open Withdrawals & refunds to review it.'});
   const {data:entry,error}=await s.from('tournament_registrations').select('*').eq('id',id).single();if(error||!entry)throw new Error('Registration not found.');
   await prepareWithdrawal(entry);
   saved=await withdrawalRpc(s,'hpcc_withdraw_tournament',{p_registration:id,p_actor:admin.user.id,p_reason:note.trim(),p_refund:body.refund_requested,p_version:entry.updated_at||null});
  }else{
   const {data:w,error}=await s.from('hpcc_tournament_withdrawals').select('*').eq('id',id).single();if(error)throw new Error(withdrawalError(error));if(!w)throw new Error('Withdrawal not found.');
   const {data:entry,error:entryError}=await s.from('tournament_registrations').select('*').eq('id',w.registration_id).single();if(entryError||!entry)throw new Error('Registration not found.');
   if(action==='stripe')saved=await processStripeWithdrawal(s,entry,w,admin.user.id,note.trim(),refundAmount(body.amount),body.acknowledged);
   else{
    if(action==='manual'&&body.acknowledged!==true)throw new Error('Confirm the refund has already been paid outside this website.');
    saved=await withdrawalRpc(s,'hpcc_review_withdrawal',{p_id:id,p_actor:admin.user.id,p_action:action,p_note:note.trim(),p_amount:action==='manual'?refundAmount(body.amount):null,p_method:action==='manual'?body.method:null,p_reference:action==='manual'?body.reference:null});
   }
  }
  revalidatePath('/club-admin','layout');revalidatePath('/tournaments','layout');revalidatePath('/');
  return NextResponse.json({ok:true,status:saved.status,message:action==='withdraw'?'Entry withdrawn and removed from confirmed lists. History retained; any refund still needs review.':saved.status==='refunded'?'Refund verified/recorded. Registration remains withdrawn and history is retained.':saved.status==='processing'?'Stripe refund is processing or needs status review. No completed refund is claimed.':'Refund decision saved. The player remains withdrawn.'});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save withdrawal.'},{status:400});}
}
