-- HPCC only. Apply existing v4_6/v4_8 setup first. Additive/repeatable; no resets.
begin;
create table if not exists public.hpcc_membership_withdrawals(
 id uuid primary key default gen_random_uuid(),member_id uuid not null unique references public.club_memberships(id) on delete restrict,
 renewal_id uuid references public.membership_renewals(id) on delete restrict,
 reason text not null,requested_by uuid not null,requested_at timestamptz not null default now(),
 status text not null check(status in ('pending','completed','not_required')),
 refund_due_cents integer not null default 0,refund_requested boolean not null,policy_reviewed boolean not null,
 registration_snapshot jsonb not null,payment_snapshot jsonb not null,
 reviewed_by uuid,reviewed_at timestamptz,completed_at timestamptz,method text,refund_reference text,review_note text
);
alter table public.hpcc_membership_withdrawals enable row level security;
revoke all on public.hpcc_membership_withdrawals from public,anon,authenticated;
grant all on public.hpcc_membership_withdrawals to service_role;
create or replace function public.hpcc_keep_member_withdrawn() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.hpcc_membership_withdrawals where member_id=new.id) then
  new.membership_status:='cancelled';new.membership_id:=old.membership_id;
 end if;return new;
end $$;
drop trigger if exists hpcc_member_withdrawn_guard on public.club_memberships;
create trigger hpcc_member_withdrawn_guard before update on public.club_memberships for each row execute function public.hpcc_keep_member_withdrawn();
create or replace function public.hpcc_withdraw_membership(p_member uuid,p_renewal uuid,p_actor uuid,p_reason text,p_refund boolean,p_policy boolean,p_version timestamptz,p_policy_text text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.club_memberships%rowtype; w public.hpcc_membership_withdrawals%rowtype;r public.membership_renewals%rowtype; snap jsonb; fee int; paid boolean;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 if length(trim(coalesce(p_policy_text,'')))<3 or length(p_policy_text)>20000 then raise exception 'Applicable policy text required';end if;
 if p_policy is distinct from true or p_refund is null or length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>2000 then raise exception 'Reason, refund choice and policy review required';end if;
 select * into m from public.club_memberships where id=p_member for update;if not found then raise exception 'Membership not found';end if;
 select * into w from public.hpcc_membership_withdrawals where member_id=m.id;if found then return to_jsonb(w);end if;
 if m.updated_at is distinct from p_version then raise exception 'Membership changed; refresh before withdrawing';end if;
 if p_renewal is not null then
  select * into r from public.membership_renewals where id=p_renewal and member_id=m.id for update;if not found then raise exception 'Renewal does not belong to this member';end if;
  fee:=r.amount_cents;paid:=r.status='paid';snap:=to_jsonb(r)||jsonb_build_object('kind','membership_renewal');
 else fee:=coalesce(m.total_amount_cents,0);paid:=m.payment_status in ('paid','manual_paid');snap:=to_jsonb(m)||jsonb_build_object('kind','membership');end if;
 insert into public.hpcc_membership_withdrawals(member_id,renewal_id,reason,requested_by,status,refund_due_cents,refund_requested,policy_reviewed,registration_snapshot,payment_snapshot)
 values(m.id,p_renewal,trim(p_reason),p_actor,case when p_refund and paid and fee>0 then 'pending' else 'not_required' end,case when p_refund and paid then greatest(fee,0) else 0 end,p_refund,true,to_jsonb(m)||jsonb_build_object('reviewed_policy',p_policy_text,'accepted_policy_snapshot',coalesce(nullif(to_jsonb(m)->'consent_snapshot','null'::jsonb),(select summary from public.audit_logs where entity_id=m.id and action='registration_policy_accepted' order by created_at desc limit 1))),snap) returning * into w;
 update public.club_memberships set membership_status='cancelled',updated_at=now() where id=m.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary)values(p_actor,'membership_withdrawn','membership',m.id,jsonb_build_object('withdrawal_id',w.id,'renewal_id',p_renewal,'reason',w.reason,'refund_due_cents',w.refund_due_cents,'policy_reviewed',true));return to_jsonb(w);
end $$;
create or replace function public.hpcc_complete_membership_refund(p_id uuid,p_actor uuid,p_method text,p_note text,p_reference text,p_full boolean,p_evidence jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.club_memberships%rowtype;w public.hpcc_membership_withdrawals%rowtype;checkout text;intent text;fee int;receipt uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 select m0.* into m from public.club_memberships m0 join public.hpcc_membership_withdrawals w0 on w0.member_id=m0.id where w0.id=p_id for update of m0;if not found then raise exception 'Withdrawal not found';end if;
 select * into w from public.hpcc_membership_withdrawals where id=p_id for update;
 if w.status='completed' then return to_jsonb(w);end if;
 fee:=case when w.renewal_id is null then (w.payment_snapshot->>'total_amount_cents')::int else (w.payment_snapshot->>'amount_cents')::int end;
 checkout:=nullif(w.payment_snapshot->>'stripe_checkout_session_id','');intent:=nullif(w.payment_snapshot->>'stripe_payment_intent_id','');
 if w.status<>'pending' or w.refund_due_cents<=0 or w.refund_due_cents is distinct from fee then raise exception 'No full-fee refund is due';end if;
 if p_full is distinct from true or length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 or length(trim(coalesce(p_reference,'')))<3 or length(p_reference)>2000 then raise exception 'Full-refund acknowledgement, note and reference required';end if;
 if p_method='stripe' then
  if checkout is null or p_evidence->>'checkout' is distinct from checkout or p_evidence->>'currency' is distinct from 'nzd' or p_evidence->>'status' is distinct from 'succeeded' or (p_evidence->>'amount_cents')::int is distinct from fee or length(coalesce(p_evidence->>'intent',''))=0 or (intent is not null and p_evidence->>'intent' is distinct from intent) then raise exception 'Verified full Stripe refund evidence required';end if;
 elsif p_method in ('cash','bank_transfer','manual_verified') then
  if checkout is not null or intent is not null then raise exception 'Stripe-linked payments cannot use offline refunds';end if;
  select p.id into receipt from public.payment_records p where p.payment_type='membership' and p.reference_id=m.id and p.status='paid' and p.amount_cents=fee and
   ((w.renewal_id is not null and p.id=w.renewal_id) or (w.renewal_id is null and not exists(select 1 from public.membership_renewals r where r.id=p.id))) order by p.id limit 1;
  if receipt is null then raise exception 'Verified paid receipt for the selected membership payment required';end if;
 else raise exception 'Invalid refund method';end if;
 update public.hpcc_membership_withdrawals set status='completed',method=p_method,refund_reference=trim(p_reference),review_note=trim(p_note),reviewed_by=p_actor,reviewed_at=now(),completed_at=now() where id=w.id returning * into w;
 if w.renewal_id is null then update public.club_memberships set payment_status='refunded',updated_at=now() where id=m.id;
 else update public.membership_renewals set status='refunded',updated_at=now() where id=w.renewal_id and member_id=m.id;end if;
 update public.payment_records p set status='refunded' where p.payment_type='membership' and p.reference_id=m.id and
  ((w.renewal_id is not null and p.id=w.renewal_id) or (w.renewal_id is null and ((checkout is not null and p.stripe_checkout_session_id=checkout) or (checkout is null and p.id=receipt))));
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary)values(p_actor,'membership_full_refund_verified','membership',m.id,jsonb_build_object('withdrawal_id',w.id,'renewal_id',w.renewal_id,'amount_cents',fee,'method',p_method,'reference',w.refund_reference,'note',w.review_note,'stripe_evidence',p_evidence));return to_jsonb(w);
end $$;
-- Late verified payments retain receipts without extending/reactivating a withdrawn membership.
create or replace function public.hpcc_record_withdrawn_member_payment(p_member uuid,p_renewal uuid,p_session text,p_intent text,p_amount int)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.club_memberships%rowtype;r public.membership_renewals%rowtype;receipt uuid;
begin
 if p_session is null or length(coalesce(p_intent,''))=0 or coalesce(p_amount,0)<=0 then raise exception 'Verified payment identifiers and amount required';end if;
 select * into m from public.club_memberships where id=p_member for update;
 if not found or m.membership_status<>'cancelled' then raise exception 'Withdrawn membership required';end if;
 if p_renewal is null then
  if m.stripe_checkout_session_id is distinct from p_session or m.total_amount_cents is distinct from p_amount or m.payment_status='refunded' then raise exception 'Payment mismatch or refunded';end if;
  update public.club_memberships set payment_status='paid',stripe_payment_intent_id=p_intent,updated_at=now() where id=m.id;receipt:=m.id;
 else
  select * into r from public.membership_renewals where id=p_renewal and member_id=m.id for update;
  if not found or r.stripe_checkout_session_id is distinct from p_session or r.amount_cents is distinct from p_amount or r.status='refunded' then raise exception 'Renewal payment mismatch or refunded';end if;
  update public.membership_renewals set status='paid',stripe_payment_intent_id=p_intent,updated_at=now() where id=r.id;receipt:=r.id;
 end if;
 insert into public.payment_records(id,payment_type,reference_id,email,amount_cents,status,stripe_checkout_session_id,stripe_payment_intent_id)values(receipt,'membership',m.id,m.email,p_amount,'paid',p_session,p_intent) on conflict(id) do nothing;
 return to_jsonb(m);
end $$;
revoke all on function public.hpcc_withdraw_membership(uuid,uuid,uuid,text,boolean,boolean,timestamptz,text),public.hpcc_complete_membership_refund(uuid,uuid,text,text,text,boolean,jsonb),public.hpcc_record_withdrawn_member_payment(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.hpcc_withdraw_membership(uuid,uuid,uuid,text,boolean,boolean,timestamptz,text),public.hpcc_complete_membership_refund(uuid,uuid,text,text,text,boolean,jsonb),public.hpcc_record_withdrawn_member_payment(uuid,uuid,text,text,integer) to service_role;
create or replace function public.hpcc_approve_payment(p_kind text,p_id uuid,p_actor uuid,p_method text,p_note text,p_full boolean,p_checkout text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; tab text; amount int; actor_name text; saved jsonb; opt jsonb; start_day date; end_day date; chosen_end date; evt public.tournaments%rowtype;
begin
 select coalesce(full_name,email) into actor_name from public.profiles where id=p_actor and is_active and role in ('admin','super_admin');
 if not found then raise exception 'Admin or Super Admin required';end if;
 if coalesce(p_kind,'') not in ('membership','tournament') or coalesce(p_method,'') not in ('bank_transfer','cash','manual_verified') or not coalesce(p_full,false) or length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 then raise exception 'Full payment acknowledgement, method and reference/note required';end if;
 tab:=case when p_kind='membership' then 'club_memberships' else 'tournament_registrations' end;
 execute format('select to_jsonb(r) from public.%I r where id=$1 for update',tab) into r using p_id;
 if r is null then raise exception 'Registration missing';end if;
 if exists(select 1 from public.audit_logs where entity_id=p_id and action='payment_approved') and r->>'payment_status'='paid' and coalesce(r->>'registration_status',r->>'membership_status')<>'cancelled' then return r||jsonb_build_object('approval_reused',true,'approved_by',(select summary->>'approver' from public.audit_logs where entity_id=p_id and action='payment_approved' order by created_at limit 1));end if;
 if r->>'payment_status' not in ('pending_payment','failed','expired') or coalesce(r->>'registration_status',r->>'membership_status')='cancelled' then raise exception 'Paid, refunded or cancelled entry cannot be approved';end if;
 if nullif(r->>'stripe_payment_intent_id','') is not null or (r->>'stripe_checkout_session_id') is distinct from p_checkout then raise exception 'Stripe payment requires verification or checkout changed';end if;
 if p_kind='tournament' then
  select * into evt from public.tournaments where id=(r->>'tournament_id')::uuid for update;
  if not found then raise exception 'Tournament missing';end if;
  if evt.tournament_type='club_calendar' and not exists(select 1 from public.club_memberships m where m.membership_id=r->>'membership_id' and m.membership_status='active' and m.payment_status in ('paid','manual_paid','waived') and m.membership_end_date>=(now() at time zone 'Pacific/Auckland')::date) then raise exception 'Active club membership is required before approval';end if;
  if coalesce(evt.max_players,0)>0 and (select count(*) from public.tournament_registrations where tournament_id=evt.id and payment_status='paid' and registration_status='confirmed' and id<>p_id)>=evt.max_players then raise exception 'Tournament capacity reached; tentative entries reserve no place';end if;
 end if;
 amount:=coalesce((r->>case when p_kind='membership' then 'total_amount_cents' else 'entry_fee_cents' end)::int,0);
 if amount<=0 then raise exception 'A full payable amount is required';end if;
 if exists(select 1 from public.payment_records where reference_id=p_id and payment_type=p_kind) then raise exception 'A receipt already exists; reconcile before approval';end if;
 insert into public.payment_records(payment_type,reference_id,email,amount_cents,status)values(p_kind,p_id,r->>'email',amount,'paid');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary)values(p_actor,'payment_approved',p_kind,p_id,jsonb_build_object('approver',actor_name,'approved_at',now(),'method',p_method,'amount_cents',amount,'note',trim(p_note),'full_payment',true));
 if p_kind='membership' then
  start_day:=(now() at time zone 'Pacific/Auckland')::date;chosen_end:=null;
  for opt in select * from jsonb_array_elements(coalesce(r->'membership_options','[]')) loop
   select case when m.valid_until_month is not null then (make_date(extract(year from start_day)::int+case when extract(month from start_day)>m.valid_until_month then 1 else 0 end,m.valid_until_month,1)+interval '1 month -1 day')::date else (start_day+make_interval(months=>coalesce(m.validity_months,12))-interval '1 day')::date end into end_day from public.membership_options m where m.key=opt->>'key';
   chosen_end:=greatest(chosen_end,end_day);
  end loop;
  if chosen_end is null then raise exception 'Membership validity is not configured';end if;
  -- Existing allocator preserves club IDs and is guarded by the member row lock.
  update public.club_memberships set payment_status='paid' where id=p_id;
  if r->>'membership_id' is null then perform public.assign_membership_id(p_id);end if;
  update public.club_memberships set payment_status='paid',payment_method=p_method,membership_status='active',membership_start_date=start_day,membership_end_date=chosen_end,updated_at=now() where id=p_id returning to_jsonb(club_memberships.*) into saved;
 else
  update public.tournament_registrations set payment_status='paid',payment_method=p_method,registration_status='confirmed',updated_at=now() where id=p_id returning to_jsonb(tournament_registrations.*) into saved;
 end if;
 return saved||jsonb_build_object('approval_reused',false,'approved_by',actor_name);
end $$;revoke all on function public.hpcc_approve_payment(text,uuid,uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.hpcc_approve_payment(text,uuid,uuid,text,text,boolean,text) to service_role;
commit;
