import {getStripe} from '@/lib/stripe';
import {paymentConfiguration} from '@/lib/paymentConfig';
import {MEMBERSHIP_REGISTRATION_POLICY} from '@/lib/registrationPolicies';
export const MEMBERSHIP_WITHDRAWAL_SETUP='Membership withdrawal/refund setup requires additive HPCC migration_v4_12_membership_withdrawals.sql (after v4_6 and v4_8).';
export async function memberWithdrawalRpc(s:any,name:string,args:any){const {data,error}=await s.rpc(name,args);if(error)throw Error(['PGRST202','PGRST205','42P01','42883','42703'].includes(error.code)?MEMBERSHIP_WITHDRAWAL_SETUP:error.message);if(!data?.id)throw Error('Membership withdrawal could not be verified.');return data;}
export function membershipPaymentSource(m:any,renewal:any=null){return renewal?{...renewal,kind:'membership_renewal',fee:Number(renewal.amount_cents||0),paid:renewal.status==='paid',renewal_id:renewal.id}:{...m,kind:'membership',fee:Number(m.total_amount_cents||0),paid:['paid','manual_paid'].includes(m.payment_status),renewal_id:null};}
export async function readMembershipWithdrawal(s:any,id:string){
 const {data:m,error}=await s.from('club_memberships').select('*').eq('id',id).single();if(error||!m)throw Error('Membership not found.');
 const {data:renewals,error:re}=await s.from('membership_renewals').select('*').eq('member_id',id).order('created_at',{ascending:false});if(re)throw Error('Renewal history could not be read. Apply HPCC v4_6 and retry.');
 const {data:w,error:we}=await s.from('hpcc_membership_withdrawals').select('*').eq('member_id',id).maybeSingle();if(we)throw Error(MEMBERSHIP_WITHDRAWAL_SETUP);
 const {data:logs,error:le}=await s.from('audit_logs').select('summary').eq('entity_id',id).eq('action','registration_policy_accepted').order('created_at',{ascending:false}).limit(1);if(le)throw Error('Accepted policy could not be read.');
 const policy=w?.registration_snapshot?.reviewed_policy||w?.registration_snapshot?.accepted_policy_snapshot?.policy||m.consent_snapshot?.policy||logs?.[0]?.summary?.policy||MEMBERSHIP_REGISTRATION_POLICY;
 const sources=[membershipPaymentSource(m),...(renewals||[]).map((r:any)=>membershipPaymentSource(m,r))];
 const selected=w?{...w.payment_snapshot,kind:w.renewal_id?'membership_renewal':'membership',renewal_id:w.renewal_id,fee:Number(w.renewal_id?w.payment_snapshot.amount_cents:w.payment_snapshot.total_amount_cents),paid:w.renewal_id?w.payment_snapshot.status==='paid':['paid','manual_paid'].includes(w.payment_snapshot.payment_status)}:sources.find((p:any)=>p.renewal_id&&p.paid)||sources[0];
 return {member:m,renewals:renewals||[],withdrawal:w,policy,sources,selected};
}
export async function prepareMembershipWithdrawal(m:any,renewals:any[]){
 const sources=[membershipPaymentSource(m),...renewals.map(r=>membershipPaymentSource(m,r))];
 for(const p of sources){if(!p.stripe_checkout_session_id)continue;const stripe=getStripe();const session=await stripe.checkout.sessions.retrieve(p.stripe_checkout_session_id);
 if(session.metadata?.type!==p.kind||session.metadata?.membership_id!==m.id||(p.renewal_id&&session.metadata?.renewal_id!==p.renewal_id))throw Error('Linked membership checkout does not match.');
 if(session.status==='complete'&&!p.paid&&p.status!=='refunded'&&p.payment_status!=='refunded')throw Error('Verify the completed/processing Stripe membership payment before withdrawing.');
 if(!p.paid&&session.payment_intent){const pi=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id);if(['processing','requires_capture','succeeded'].includes(pi.status)&&session.status!=='complete')throw Error('Stripe payment is processing. Verify it before withdrawing.');}
 if(session.status==='open'){const expired=await stripe.checkout.sessions.expire(session.id);if(expired.status!=='expired')throw Error('Open membership checkout could not be expired safely.');}
 }
}
export function validateMembershipRefundSession(session:any,memberId:string,p:any){
 const cfg=paymentConfiguration();if(session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.currency!=='nzd'||session.amount_total!==p.fee||p.fee<=0)throw Error('Stripe must verify the selected completed NZD membership payment and full fee.');
 if(session.id!==p.stripe_checkout_session_id||session.metadata?.type!==p.kind||session.metadata?.membership_id!==memberId||(p.renewal_id&&session.metadata?.renewal_id!==p.renewal_id))throw Error('Stripe membership/renewal payment identity mismatch.');
 if((cfg.production||cfg.mode==='live')&&!session.livemode||cfg.mode==='test'&&session.livemode)throw Error('Stripe mode mismatch.');const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
 if(!intent||p.stripe_payment_intent_id&&p.stripe_payment_intent_id!==intent)throw Error('Payment intent mismatch.');return intent;
}
export async function verifyMembershipRefund(s:any,context:any,actor:string,note:string,ack:boolean){
 const {member:m,withdrawal:w,selected:p}=context;if(!ack)throw Error('Confirm policy review and full-refund verification.');if(w?.status==='completed')return w;
 if(!w||w.status!=='pending'||w.refund_due_cents!==p.fee||p.fee<=0||!p.stripe_checkout_session_id)throw Error('No full Stripe membership refund is due.');
 const stripe=getStripe();const session=await stripe.checkout.sessions.retrieve(p.stripe_checkout_session_id);const intent=validateMembershipRefundSession(session,m.id,p);
 const charges=await stripe.charges.list({payment_intent:intent,limit:100});const paid=charges.data.filter((c:any)=>c.paid&&c.status==='succeeded');if(charges.has_more||paid.length!==1)throw Error('The selected charge requires manual review.');const c=paid[0];
 if(c.currency!=='nzd'||c.amount!==p.fee||!c.refunded||c.amount_refunded!==c.amount||c.payment_intent!==intent)throw Error('Full successful membership refund not verified. Partial/pending refunds remain Pending.');
 const refunds=await stripe.refunds.list({payment_intent:intent,limit:100});const successful=refunds.data.filter((r:any)=>r.status==='succeeded'&&r.currency==='nzd'&&(typeof r.payment_intent==='string'?r.payment_intent:r.payment_intent?.id)===intent&&(typeof r.charge==='string'?r.charge:r.charge?.id)===c.id);
 if(refunds.has_more||successful.reduce((sum:number,r:any)=>sum+r.amount,0)!==p.fee)throw Error('Successful refunds do not total the selected full membership fee.');
 return memberWithdrawalRpc(s,'hpcc_complete_membership_refund',{p_id:w.id,p_actor:actor,p_method:'stripe',p_note:note,p_reference:successful.map((r:any)=>r.id).sort().join(', '),p_full:true,p_evidence:{checkout:session.id,intent,currency:'nzd',amount_cents:p.fee,status:'succeeded'}});
}
