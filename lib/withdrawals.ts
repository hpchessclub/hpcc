import {getStripe} from '@/lib/stripe';
import {paymentConfiguration} from '@/lib/paymentConfig';
export const WITHDRAWAL_SETUP='Withdrawal/refund setup is required. Apply HPCC v4_10 and migration_v4_11_full_refund_tracking.sql in the existing HPCC Supabase project.';
export function withdrawalError(error:any){return ['PGRST202','PGRST205','42P01','42883','42703','PGRST204'].includes(error?.code)?WITHDRAWAL_SETUP:error?.message||'Unable to save withdrawal.';}
export async function withdrawalRpc(s:any,name:string,args:any){const {data,error}=await s.rpc(name,args);if(error)throw new Error(withdrawalError(error));if(!data?.id)throw new Error('The saved withdrawal could not be verified.');return data;}
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
 if(session.status==='complete'&&entry.payment_status!=='paid'&&entry.payment_status!=='refunded')throw new Error('Completed/processing Stripe checkout: verify payment before withdrawing.');
 if(session.status==='open'){session=await stripe.checkout.sessions.expire(session.id);if(session.status!=='expired')throw new Error('Open checkout could not be expired. Refresh and verify Stripe.');}
 if(!['complete','expired'].includes(session.status||''))throw new Error('Checkout state needs review before withdrawal.');
}
export async function verifyFullStripeRefund(s:any,entry:any,w:any,actor:string,note:string,ack:boolean){
 if(ack!==true)throw new Error('Confirm you reviewed the full-fee refund and policy.');
 if(w.status==='completed')return w;
 if(w.status!=='pending'||w.refund_due_cents<=0||w.refund_due_cents!==Number(entry.entry_fee_cents))throw new Error('No full-fee refund is due.');
 const stripe=getStripe();const session=await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id);const intent=validateRefundSession(session,entry);
 const charges=await stripe.charges.list({payment_intent:intent,limit:100});
 const paid=charges.data.filter((c:any)=>c.paid&&c.status==='succeeded');
 if(charges.has_more||paid.length!==1)throw new Error('The linked charge needs manual review.');
 const charge=paid[0];
 if(charge.currency!=='nzd'||charge.amount!==w.refund_due_cents||!charge.refunded||charge.amount_refunded!==charge.amount||charge.payment_intent!==intent)throw new Error('Stripe has not verified a successful full-fee refund. Partial or pending refunds remain Pending.');
 const refunds=await stripe.refunds.list({payment_intent:intent,limit:100});
 if(refunds.has_more)throw new Error('Too many refund records; manual Stripe review required.');
 const successful=refunds.data.filter((r:any)=>r.status==='succeeded'&&r.currency==='nzd'&&(typeof r.payment_intent==='string'?r.payment_intent:r.payment_intent?.id)===intent&&(typeof r.charge==='string'?r.charge:r.charge?.id)===charge.id);
 if(successful.reduce((n:number,r:any)=>n+r.amount,0)!==w.refund_due_cents)throw new Error('Successful refunds do not total the full entry fee. The request remains Pending.');
 return await withdrawalRpc(s,'hpcc_complete_refund_v2',{p_id:w.id,p_actor:actor,p_method:'stripe',p_note:note,p_reference:successful.map((r:any)=>r.id).sort().join(', '),p_full:true,p_evidence:{checkout:session.id,intent,currency:'nzd',amount_cents:w.refund_due_cents,status:'succeeded'}});
}
// Completion is an explicit Admin/Super Admin verification, not an automatic webhook action.
export async function syncWithdrawalRefundEvent(_s:any,_refund:any){}
