import { paymentConfiguration } from "@/lib/paymentConfig";
import { sendMembershipConfirmation } from "@/lib/membershipPayment";
export async function confirmMembershipRenewal(s: any, session: any) {
  const { data: renewal, error } = await s.from("membership_renewals").select("*").eq("id", session.metadata?.renewal_id).single();
  if (error || !renewal) throw new Error("Renewal record unavailable");
  const config = paymentConfiguration();
  if (session.metadata?.type !== "membership_renewal" || session.metadata?.membership_id !== renewal.member_id || session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid" || session.currency !== "nzd" || session.amount_total !== Number(renewal.amount_cents) || session.amount_total <= 0 || renewal.stripe_checkout_session_id !== session.id) throw new Error("Renewal payment mismatch");
  if (((config.production || config.mode === "live") && !session.livemode) || (config.mode === "test" && session.livemode)) throw new Error("Renewal payment mode mismatch");
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
  const {data:current,error:currentError}=await s.from('club_memberships').select('*').eq('id',renewal.member_id).single();if(currentError||!current)throw new Error('Membership record unavailable');
  if(current.membership_status==='cancelled'){
   const result=await s.rpc('hpcc_record_withdrawn_member_payment',{p_member:renewal.member_id,p_renewal:renewal.id,p_session:session.id,p_intent:pi,p_amount:session.amount_total});if(result.error||!result.data)throw new Error('Withdrawn renewal payment requires v4_12 setup/review.');return {status:'withdrawn',membership_id:current.membership_id,email_status:'not_sent',message:'Membership withdrawn. Renewal receipt retained without reactivation or extending validity.'};
  }
  const { data: member, error: applyError } = await s.rpc("apply_membership_renewal", { p_renewal_id: renewal.id, p_session_id: session.id, p_payment_intent: pi });
  if (applyError || !member) throw applyError || new Error("Renewal could not be applied");
  const { error: receiptError } = await s.from("payment_records").upsert({ id: renewal.id, payment_type: "membership", reference_id: renewal.member_id, email: member.email, amount_cents: renewal.amount_cents, status: "paid", stripe_checkout_session_id: session.id, stripe_payment_intent_id: pi }, { onConflict: "id", ignoreDuplicates: true });
  if (receiptError) throw receiptError;
  if(member.membership_status==='cancelled')return {status:'withdrawn',membership_id:member.membership_id,email_status:'not_sent'};
  const emailStatus = await sendMembershipConfirmation(s, { ...member, membership_start_date: member.renewal_start_date || member.membership_start_date, membership_end_date: member.renewal_end_date || member.membership_end_date }, renewal.id);
  return { status: "confirmed", membership_id: member.membership_id, membership_end_date: member.renewal_end_date || member.membership_end_date, email_status: emailStatus };
}
