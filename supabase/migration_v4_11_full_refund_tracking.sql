-- HPCC only. Apply v4_10 first. Additive/repeatable; no record/payment deletion.
begin;
alter table public.hpcc_tournament_withdrawals add column if not exists refund_due_cents integer not null default 0;
alter table public.hpcc_tournament_withdrawals add column if not exists policy_reviewed boolean not null default false;
alter table public.hpcc_tournament_withdrawals add column if not exists workflow_revision integer;
alter table public.hpcc_tournament_withdrawals drop constraint if exists hpcc_tournament_withdrawals_status_check;
-- Preserve prior decisions/partial-refund information in the private audit before normalizing labels.
insert into public.audit_logs(action,entity_type,entity_id,summary)
select 'withdrawal_workflow_upgraded','tournament_registration',registration_id,to_jsonb(w) from public.hpcc_tournament_withdrawals w where workflow_revision is null;
update public.hpcc_tournament_withdrawals set
 refund_due_cents=case when status in ('requested','processing','refunded') and (registration_snapshot->>'payment_status'='paid' or exists(select 1 from public.tournament_registrations r where r.id=registration_id and r.payment_status in ('paid','refunded'))) then greatest(coalesce((registration_snapshot->>'entry_fee_cents')::integer,0),0) else 0 end,
 status=case when status='refunded' and amount_cents=coalesce((registration_snapshot->>'entry_fee_cents')::integer,0) and amount_cents>0 then 'completed' when status in ('requested','processing','refunded') and (registration_snapshot->>'payment_status'='paid' or exists(select 1 from public.tournament_registrations r where r.id=registration_id and r.payment_status in ('paid','refunded'))) and coalesce((registration_snapshot->>'entry_fee_cents')::integer,0)>0 then 'pending' else 'not_required' end,
 refund_reference=coalesce(refund_reference,stripe_refund_id),
 workflow_revision=2 where workflow_revision is null;
alter table public.hpcc_tournament_withdrawals add constraint hpcc_tournament_withdrawals_status_check check(status in ('pending','completed','not_required'));
-- Disable obsolete financial functions so old clients cannot process a refund or bypass policy acknowledgement.
revoke all on function public.hpcc_withdraw_tournament(uuid,uuid,text,boolean,timestamptz),public.hpcc_review_withdrawal(uuid,uuid,text,text,integer,text,text),public.hpcc_finish_stripe_refund(uuid,text,text,text) from public,anon,authenticated,service_role;
create or replace function public.hpcc_withdraw_v2(p_registration uuid,p_actor uuid,p_reason text,p_refund boolean,p_policy_reviewed boolean,p_version timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.tournament_registrations%rowtype; w public.hpcc_tournament_withdrawals%rowtype; due integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 if p_policy_reviewed is distinct from true or p_refund is null or length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>2000 then raise exception 'Reason, refund choice and policy review required';end if;
 select * into r from public.tournament_registrations where id=p_registration for update;if not found then raise exception 'Registration not found';end if;
 select * into w from public.hpcc_tournament_withdrawals where registration_id=r.id;if found then return to_jsonb(w);end if;
 if r.updated_at is distinct from p_version then raise exception 'Registration changed; refresh before withdrawing';end if;
 due:=case when p_refund and r.payment_status='paid' then greatest(coalesce(r.entry_fee_cents,0),0) else 0 end;
 insert into public.hpcc_tournament_withdrawals(registration_id,reason,requested_by,refund_requested,status,registration_snapshot,refund_due_cents,policy_reviewed,workflow_revision)
 values(r.id,trim(p_reason),p_actor,p_refund,case when due>0 then 'pending' else 'not_required' end,to_jsonb(r)||jsonb_build_object('accepted_policy_snapshot',coalesce(nullif(to_jsonb(r)->'consent_snapshot','null'::jsonb),(select summary from public.audit_logs where entity_id=r.id and action='registration_policy_accepted' order by created_at desc limit 1)),'event_policy_at_withdrawal',(select to_jsonb(t)->>'registration_policy' from public.tournaments t where t.id=r.tournament_id)),due,true,2) returning * into w;
 update public.tournament_registrations set registration_status='cancelled',updated_at=now() where id=r.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(p_actor,'tournament_withdrawn','tournament_registration',r.id,jsonb_build_object('withdrawal_id',w.id,'reason',w.reason,'refund_due_cents',due,'policy_reviewed',true));
 return to_jsonb(w);
end $$;
create or replace function public.hpcc_complete_refund_v2(p_id uuid,p_actor uuid,p_method text,p_note text,p_reference text,p_full boolean,p_evidence jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.tournament_registrations%rowtype; w public.hpcc_tournament_withdrawals%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 select r0.* into r from public.tournament_registrations r0 join public.hpcc_tournament_withdrawals w0 on w0.registration_id=r0.id where w0.id=p_id for update of r0;
 if not found then raise exception 'Withdrawal not found';end if;
 select * into w from public.hpcc_tournament_withdrawals where id=p_id for update;
 if w.status='completed' then return to_jsonb(w);end if;
 if w.status<>'pending' or w.refund_due_cents<=0 or w.refund_due_cents is distinct from r.entry_fee_cents then raise exception 'No full-fee refund is due';end if;
 if p_full is distinct from true or length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 or length(trim(coalesce(p_reference,'')))<3 or length(p_reference)>2000 then raise exception 'Full-refund acknowledgement, note and reference required';end if;
 if p_method='stripe' then
  if r.stripe_checkout_session_id is null or p_evidence->>'checkout' is distinct from r.stripe_checkout_session_id or p_evidence->>'currency' is distinct from 'nzd' or p_evidence->>'status' is distinct from 'succeeded' or (p_evidence->>'amount_cents')::integer is distinct from w.refund_due_cents or length(coalesce(p_evidence->>'intent',''))=0 then raise exception 'Verified full Stripe refund evidence required';end if;
  if r.stripe_payment_intent_id is not null and r.stripe_payment_intent_id is distinct from p_evidence->>'intent' then raise exception 'Payment intent mismatch';end if;
 elsif p_method in ('cash','bank_transfer','manual_verified') then
  if r.stripe_checkout_session_id is not null or r.stripe_payment_intent_id is not null then raise exception 'Stripe-linked payments cannot use offline refunds';end if;
  if r.payment_status<>'paid' or not exists(select 1 from public.payment_records where payment_type='tournament' and reference_id=r.id and status='paid' and amount_cents=w.refund_due_cents) then raise exception 'Verified full paid receipt required';end if;
 else raise exception 'Invalid refund method';end if;
 update public.hpcc_tournament_withdrawals set status='completed',amount_cents=refund_due_cents,method=p_method,refund_reference=trim(p_reference),review_note=trim(p_note),reviewed_by=p_actor,reviewed_at=now(),completed_at=now(),last_error=null where id=w.id returning * into w;
 update public.tournament_registrations set payment_status='refunded',registration_status='cancelled',updated_at=now() where id=r.id;
 -- Change receipt status only after full verification; retain original rows and amounts.
 update public.payment_records set status='refunded' where payment_type='tournament' and reference_id=r.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(p_actor,'full_refund_verified','tournament_registration',r.id,jsonb_build_object('withdrawal_id',w.id,'amount_cents',w.refund_due_cents,'method',p_method,'reference',w.refund_reference,'note',w.review_note,'stripe_evidence',p_evidence));
 return to_jsonb(w);
end $$;
revoke all on function public.hpcc_withdraw_v2(uuid,uuid,text,boolean,boolean,timestamptz),public.hpcc_complete_refund_v2(uuid,uuid,text,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.hpcc_withdraw_v2(uuid,uuid,text,boolean,boolean,timestamptz),public.hpcc_complete_refund_v2(uuid,uuid,text,text,text,boolean,jsonb) to service_role;
commit;
