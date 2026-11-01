import {getStripe} from '@/lib/stripe';
import {paymentConfiguration} from '@/lib/paymentConfig';
import {syncTournamentRefund} from '@/lib/tournamentRefund';
export const WITHDRAWAL_SETUP='Withdrawal/refund setup is required. Apply HPCC migration_v4_10_withdrawals_refunds.sql in the existing HPCC Supabase project.';
export function withdrawalError(error:any){return ['PGRST202','PGRST205','42P01','42883'].includes(error?.code)?WITHDRAWAL_SETUP:error?.message||'Unable to save withdrawal.';}
export async function withdrawalRpc(s:any,name:string,args:any){const {data,error}=await s.rpc(name,args);if(error)throw new Error(withdrawalError(error));if(!data?.id)throw new Error('The saved withdrawal could not be verified.');return data;}
export function refundAmount(value:unknown){if(typeof value!=='string'||!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim()))throw new Error('Enter a positive NZD refund amount with at most two decimal places.');const cents=Math.round(Number(value)*100);if(!Number.isSafeInteger(cents)||cents<=0)throw new Error('Enter a positive refund amount.');return cents;}
export function validateRefundSession(session:any,entry:any){
 const config=paymentConfiguration();
 if(session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.currency!=='nzd'||session.amount_total!==Number(entry.entry_fee_cents))throw new Error('Stripe must verify the completed NZD payment and original entry fee before refunding.');
 if(session.metadata?.type!=='tournament_registration'||session.metadata.registration_id!==entry.id||session.metadata.tournament_id!==entry.tournament_id||entry.stripe_checkout_session_id!==session.id)throw new Error('Stripe payment does not match this registration.');
 if(config.production&&!session.livemode||config.mode==='live'&&!session.livemode||config.mode==='test'&&session.livemode)throw new Error('Stripe payment mode mismatch.');
 const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
 if(!intent||entry.stripe_payment_intent_id&&entry.stripe_payment_intent_id!==intent)throw new Error('Stripe payment intent does not match.');
 return intent;
}
// Expire only an unpaid open checkout. Payment/receipt history is never deleted.
export async function prepareWithdrawal(entry:any){
 if(!entry.stripe_checkout_session_id)return;
 const stripe=getStripe();let session=await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id);
 if(session.metadata?.registration_id!==entry.id||session.metadata?.tournament_id!==entry.tournament_id)throw new Error('Checkout does not match this entry. Review Stripe before withdrawing.');
 if(session.status==='open'){session=await stripe.checkout.sessions.expire(session.id);if(session.status!=='expired')throw new Error('Open checkout could not be expired. Refresh and verify Stripe.');}
 if(!['complete','expired'].includes(session.status||''))throw new Error('Checkout state needs review before withdrawal.');
}
export async function processStripeWithdrawal(s:any,entry:any,request:any,actor:string,note:string,cents:number,ack:boolean){
 if(ack!==true)throw new Error('Acknowledge the refund amount and policy review.');
 if(!entry.stripe_checkout_session_id)throw new Error('A linked Stripe checkout is required.');
 const stripe=getStripe();const session=await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id);const intent=validateRefundSession(session,entry);
 if(request.status==='processing'&&request.amount_cents!==cents)throw new Error('Use the originally approved refund amount.');
 // Inspect existing refunds BEFORE creating/retrying; Stripe idempotency keys eventually expire.
 let refund:any=request.stripe_refund_id?await stripe.refunds.retrieve(request.stripe_refund_id):null;
 if(!refund){const list=await stripe.refunds.list({payment_intent:intent,limit:100});refund=list.data.find((r:any)=>r.metadata?.hpcc_withdrawal_id===request.id);if(!refund&&list.has_more)throw new Error('More than 100 refunds exist for this payment. Review Stripe manually; no new refund was created.');}
 if(!refund){
  if(request.status==='processing'&&(!request.processing_started_at||Date.now()-new Date(request.processing_started_at).getTime()>15*60*1000))throw new Error('Refund outcome is uncertain. Review Stripe manually before any further refund; do not create another payment.');
  const charges=await stripe.charges.list({payment_intent:intent,limit:100});
  const charge=charges.data.find((c:any)=>c.paid&&c.status==='succeeded');
  if(!charge||charges.has_more||charge.currency!=='nzd'||charge.amount!==session.amount_total||cents>charge.amount-charge.amount_refunded)throw new Error('Refund exceeds the remaining verified Stripe payment, or the charge needs manual review.');
  request=await withdrawalRpc(s,'hpcc_review_withdrawal',{p_id:request.id,p_actor:actor,p_action:'stripe',p_note:note,p_amount:cents,p_method:null,p_reference:null});
  // Stable request ID + amount persist before Stripe is called, including network timeouts.
  try{refund=await stripe.refunds.create({payment_intent:intent,amount:cents,metadata:{hpcc_withdrawal_id:request.id,registration_id:entry.id}},{idempotencyKey:`hpcc-withdrawal-${request.id}`});}
  catch{await withdrawalRpc(s,'hpcc_finish_stripe_refund',{p_id:request.id,p_refund_id:null,p_status:'unknown',p_error:'Stripe refund outcome is uncertain. Retry status check; do not create a second refund.'});throw new Error('Stripe refund outcome is uncertain. The request remains Processing; use Check Stripe refund status before taking further action.');}
 }
 const actualIntent=typeof refund.payment_intent==='string'?refund.payment_intent:refund.payment_intent?.id;
 if(actualIntent!==intent||refund.amount!==cents||refund.currency!=='nzd'||refund.metadata?.hpcc_withdrawal_id!==request.id)throw new Error('Stripe refund does not match the approved request. No completion was recorded.');
 if(refund.status==='succeeded'){
  const {error}=await s.from('tournament_registrations').update({stripe_payment_intent_id:intent}).eq('id',entry.id).eq('stripe_checkout_session_id',session.id);if(error)throw new Error('Refund exists in Stripe but payment history could not be linked. Check status again; do not refund again.');
  const charges=await stripe.charges.list({payment_intent:intent,limit:100});for(const charge of charges.data)await syncTournamentRefund(s,charge);
 }
 return await withdrawalRpc(s,'hpcc_finish_stripe_refund',{p_id:request.id,p_refund_id:refund.id,p_status:refund.status,p_error:['failed','canceled'].includes(refund.status)?'Stripe reports this refund failed/cancelled. Review it in Stripe; no automatic replacement refund will be created.':null});
}
export async function syncWithdrawalRefundEvent(s:any,eventRefund:any){
 const id=eventRefund.metadata?.hpcc_withdrawal_id;if(!id)return;
 const {data:w,error}=await s.from('hpcc_tournament_withdrawals').select('*').eq('id',id).single();if(error||!w)throw new Error('Withdrawal refund record unavailable; retry required.');
 if(w.status==='refunded')return;
 if(w.status!=='processing'||w.method!=='stripe')throw new Error('Withdrawal refund state needs review.');
 const {data:r,error:readError}=await s.from('tournament_registrations').select('*').eq('id',w.registration_id).single();if(readError||!r)throw new Error('Refund registration unavailable.');
 await processStripeWithdrawal(s,r,{...w,stripe_refund_id:eventRefund.id},w.reviewed_by,w.review_note,w.amount_cents,true);
}
