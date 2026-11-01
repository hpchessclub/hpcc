-- HPCC only: additive, repeatable; never resets or deletes registrations/payments.
begin;
create table if not exists public.hpcc_tournament_withdrawals(
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null unique references public.tournament_registrations(id) on delete restrict,
 reason text not null, requested_by uuid not null, requested_at timestamptz not null default now(),
 refund_requested boolean not null default false,
 status text not null check(status in ('requested','processing','refunded','declined','not_required')),
 registration_snapshot jsonb not null,
 reviewed_by uuid, reviewed_at timestamptz, review_note text,
 amount_cents integer, method text, refund_reference text,
 stripe_refund_id text unique, processing_started_at timestamptz, completed_at timestamptz,
 last_error text
);
alter table public.hpcc_tournament_withdrawals enable row level security;
revoke all on public.hpcc_tournament_withdrawals from public,anon,authenticated;
grant all on public.hpcc_tournament_withdrawals to service_role;
create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid,action text not null,entity_type text not null,entity_id uuid,summary jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon,authenticated;
-- Database protection also covers delayed checkout webhooks, expiry and old admin clients.
create or replace function public.hpcc_keep_withdrawn_cancelled() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.hpcc_tournament_withdrawals where registration_id=new.id) then new.registration_status:='cancelled';end if;
 return new;
end $$;
drop trigger if exists hpcc_withdrawn_guard on public.tournament_registrations;
create trigger hpcc_withdrawn_guard before update on public.tournament_registrations for each row execute function public.hpcc_keep_withdrawn_cancelled();
create or replace function public.hpcc_withdraw_tournament(p_registration uuid,p_actor uuid,p_reason text,p_refund boolean,p_version timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.tournament_registrations%rowtype; w public.hpcc_tournament_withdrawals%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 if length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>2000 or p_refund is null then raise exception 'Withdrawal reason and refund choice required';end if;
 select * into r from public.tournament_registrations where id=p_registration for update;
 if not found then raise exception 'Registration not found';end if;
 select * into w from public.hpcc_tournament_withdrawals where registration_id=r.id;
 if found then return to_jsonb(w);end if;
 if r.updated_at is distinct from p_version then raise exception 'Registration changed; refresh and review before withdrawing';end if;
 insert into public.hpcc_tournament_withdrawals(registration_id,reason,requested_by,refund_requested,status,registration_snapshot)
 values(r.id,trim(p_reason),p_actor,p_refund,case when p_refund then 'requested' else 'not_required' end,to_jsonb(r)||jsonb_build_object('accepted_policy_snapshot',coalesce(nullif(to_jsonb(r)->'consent_snapshot','null'::jsonb),(select summary from public.audit_logs where entity_id=r.id and action='registration_policy_accepted' order by created_at desc limit 1)))) returning * into w;
 update public.tournament_registrations set registration_status='cancelled',updated_at=now() where id=r.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(p_actor,'tournament_withdrawn','tournament_registration',r.id,jsonb_build_object('withdrawal_id',w.id,'reason',trim(p_reason),'refund_requested',p_refund));
 return to_jsonb(w);
end $$;
create or replace function public.hpcc_review_withdrawal(p_id uuid,p_actor uuid,p_action text,p_note text,p_amount integer default null,p_method text default null,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare w public.hpcc_tournament_withdrawals%rowtype; r public.tournament_registrations%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_active and role in ('admin','super_admin')) then raise exception 'Admin or Super Admin required';end if;
 if length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 then raise exception 'Review note required';end if;
 -- Always lock registration before withdrawal, matching the withdrawal function.
 select r0.* into r from public.tournament_registrations r0 join public.hpcc_tournament_withdrawals w0 on w0.registration_id=r0.id where w0.id=p_id for update of r0;
 if not found then raise exception 'Withdrawal not found';end if;
 select * into w from public.hpcc_tournament_withdrawals where id=p_id for update;
 if p_action='decline' then
  if w.status<>'requested' then raise exception 'Only a pending request can be declined';end if;
  update public.hpcc_tournament_withdrawals set status='declined',reviewed_by=p_actor,reviewed_at=now(),review_note=trim(p_note) where id=w.id returning * into w;
 elsif p_action in ('stripe','manual') then
  if w.status='processing' and p_action='stripe' and w.method='stripe' then
   if w.amount_cents is distinct from p_amount then raise exception 'Refund already processing for a different amount';end if;return to_jsonb(w);
  end if;
  if w.status<>'requested' then raise exception 'Refund already reviewed; refresh the report';end if;
  if p_amount is null or p_amount<=0 or p_amount>coalesce(r.entry_fee_cents,0) then raise exception 'Refund amount must be positive and no greater than the entry fee';end if;
  if p_action='manual' then
   if r.stripe_checkout_session_id is not null or r.stripe_payment_intent_id is not null then raise exception 'Use Stripe for linked payments';end if;
   if r.payment_status<>'paid' or not exists(select 1 from public.payment_records where payment_type='tournament' and reference_id=r.id and status='paid' and amount_cents>=p_amount) then raise exception 'Verified paid receipt required';end if;
   if coalesce(p_method,'') not in ('cash','bank_transfer','manual_verified') or length(trim(coalesce(p_reference,'')))<3 or length(p_reference)>500 then raise exception 'Refund method and completed transaction reference required';end if;
  end if;
  update public.hpcc_tournament_withdrawals set status=case when p_action='stripe' then 'processing' else 'refunded' end,reviewed_by=p_actor,reviewed_at=now(),review_note=trim(p_note),amount_cents=p_amount,method=case when p_action='stripe' then 'stripe' else p_method end,refund_reference=case when p_action='manual' then trim(p_reference) end,processing_started_at=case when p_action='stripe' then now() end,completed_at=case when p_action='manual' then now() end where id=w.id returning * into w;
  if p_action='manual' and p_amount=r.entry_fee_cents then
   update public.tournament_registrations set payment_status='refunded',updated_at=now() where id=r.id;
  end if;
 else raise exception 'Invalid review action';end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(p_actor,'withdrawal_'||p_action,'tournament_registration',r.id,jsonb_build_object('withdrawal_id',w.id,'amount_cents',p_amount,'note',trim(p_note),'method',w.method,'reference',w.refund_reference));
 return to_jsonb(w);
end $$;
create or replace function public.hpcc_finish_stripe_refund(p_id uuid,p_refund_id text,p_status text,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare w public.hpcc_tournament_withdrawals%rowtype;
begin
 select * into w from public.hpcc_tournament_withdrawals where id=p_id for update;
 if not found or w.method<>'stripe' or w.status not in ('processing','refunded') then raise exception 'No Stripe refund in progress';end if;
 if w.stripe_refund_id is not null and w.stripe_refund_id is distinct from p_refund_id then raise exception 'Refund identity changed';end if;
 if p_refund_id is not null and p_refund_id not like 're\_%' escape '\' then raise exception 'Invalid Stripe refund ID';end if;
 if w.status='refunded' then return to_jsonb(w);end if;
 update public.hpcc_tournament_withdrawals set stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),status=case when p_status='succeeded' then 'refunded' else 'processing' end,completed_at=case when p_status='succeeded' then now() end,last_error=left(p_error,1000) where id=w.id returning * into w;
 if p_status='succeeded' then
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(w.reviewed_by,'stripe_refund_verified','tournament_registration',w.registration_id,jsonb_build_object('withdrawal_id',w.id,'refund_id',w.stripe_refund_id,'amount_cents',w.amount_cents));
 end if;
 return to_jsonb(w);
end $$;
revoke all on function public.hpcc_withdraw_tournament(uuid,uuid,text,boolean,timestamptz), public.hpcc_review_withdrawal(uuid,uuid,text,text,integer,text,text), public.hpcc_finish_stripe_refund(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.hpcc_withdraw_tournament(uuid,uuid,text,boolean,timestamptz), public.hpcc_review_withdrawal(uuid,uuid,text,text,integer,text,text), public.hpcc_finish_stripe_refund(uuid,text,text,text) to service_role;
commit;
