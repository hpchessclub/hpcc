import {getStripe} from '@/lib/stripe';
export async function syncTournamentRefund(s:any,charge:any){
 if(!charge.paid||!charge.refunded||Number(charge.amount_refunded)<Number(charge.amount))return null;
 const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;if(!intent)return null;
 const {data:entries,error}=await s.from('tournament_registrations').select('*').eq('stripe_payment_intent_id',intent);if(error)throw new Error(error.message);
 if(!entries?.length)return null;
 for(const entry of entries||[]){const {error:updateError}=await s.from('tournament_registrations').update({payment_status:'refunded',registration_status:'cancelled',updated_at:new Date().toISOString()}).eq('id',entry.id).eq('stripe_payment_intent_id',intent);if(updateError)throw new Error(updateError.message);}
 for(const entry of entries||[]){const {data:ledger,error:readError}=await s.from('payment_records').select('id').eq('stripe_payment_intent_id',intent).eq('payment_type','tournament').limit(1).maybeSingle();if(readError)throw new Error(readError.message);if(!ledger){const {error:insertError}=await s.from('payment_records').upsert({id:entry.id,payment_type:'tournament',reference_id:entry.id,email:entry.email,amount_cents:entry.entry_fee_cents,status:'refunded',stripe_checkout_session_id:entry.stripe_checkout_session_id,stripe_payment_intent_id:intent},{onConflict:'id',ignoreDuplicates:true});if(insertError)throw new Error(insertError.message);}}
 const {error:ledgerError}=await s.from('payment_records').update({status:'refunded'}).eq('stripe_payment_intent_id',intent).eq('payment_type','tournament');if(ledgerError)throw new Error(ledgerError.message);
 return entries?.length?{status:'refunded',message:'Stripe confirms a full refund. The entry is cancelled and payment history retained.'}:null;
}
export async function checkTournamentRefund(s:any,session:any){const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(!intent)return null;const charges=await getStripe().charges.list({payment_intent:intent,limit:100});const refunded=charges.data.find(c=>c.paid&&c.refunded&&c.amount_refunded>=c.amount);if(!refunded)return null;
 // Checkout can have completed before the first webhook linked the payment intent.
 const id=session.metadata?.registration_id;if(id){const {error}=await s.from('tournament_registrations').update({stripe_payment_intent_id:intent}).eq('id',id).eq('stripe_checkout_session_id',session.id);if(error)throw new Error(error.message);}
 return await syncTournamentRefund(s,refunded);}
