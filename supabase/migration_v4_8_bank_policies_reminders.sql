-- HPCC additive upgrade. Review on HPCC, back up, then run. No records reset or deleted.
begin;
create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid,action text not null,entity_type text not null,entity_id uuid,summary jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon,authenticated;
alter table public.payment_accounts enable row level security;
revoke all on public.payment_accounts from anon,authenticated;
alter table public.club_memberships enable row level security;
alter table public.tournament_registrations enable row level security;
revoke all on public.club_memberships,public.tournament_registrations from anon,authenticated;
alter table public.payment_accounts add column if not exists is_default_membership boolean not null default false;
alter table public.payment_accounts add column if not exists is_default_tournament boolean not null default false;
create unique index if not exists hpcc_one_membership_bank on public.payment_accounts(is_default_membership) where is_default_membership and is_active;
create unique index if not exists hpcc_one_tournament_bank on public.payment_accounts(is_default_tournament) where is_default_tournament and is_active;
alter table public.tournaments add column if not exists registration_policy text;
do $$ declare tab text; begin foreach tab in array array['club_memberships','tournament_registrations'] loop
 execute format('alter table public.%I add column if not exists payment_method text',tab);
 execute format('alter table public.%I add column if not exists bank_reference text',tab);
 execute format('alter table public.%I add column if not exists bank_instructions jsonb',tab);
 execute format('alter table public.%I add column if not exists consent_snapshot jsonb',tab);
 execute format('alter table public.%I add column if not exists last_payment_reminder_at timestamptz',tab);
end loop; end $$;
create table if not exists public.hpcc_reminder_log(
 id uuid primary key default gen_random_uuid(),registration_id uuid not null references public.tournament_registrations(id) on delete restrict,
 reminder_day date not null,status text not null default 'queued',claimed_at timestamptz not null default now(),sent_at timestamptz,error_message text,
 unique(registration_id,reminder_day)
);
alter table public.hpcc_reminder_log enable row level security;
revoke all on public.hpcc_reminder_log from anon,authenticated;
create or replace function public.hpcc_claim_bank(p_kind text,p_identity uuid,p_payload jsonb,p_instructions jsonb,p_policy jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old jsonb; tab text; saved jsonb; ref text; payload jsonb; field text;
begin
 if coalesce(p_kind,'') not in ('membership','tournament') then raise exception 'Invalid registration kind';end if;
 if p_payload->>'email' is null or coalesce(p_policy->>'photography','') not in ('yes','no') then raise exception 'Registration and photography answer required';end if;
 tab:=case when p_kind='membership' then 'club_memberships' else 'tournament_registrations' end;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||p_identity::text,0));
 execute format('select to_jsonb(r) from public.%I r where id=$1 for update',tab) into old using p_identity;
 if old is not null then
  if old->>'payment_method'='bank_transfer' and old->>'payment_status'='pending_payment' and coalesce(old->>'registration_status','')<>'cancelled' then
   foreach field in array array['first_name','last_name','email','phone','date_of_birth','total_amount_cents','membership_options','entry_fee_cents','category_key'] loop if p_payload ? field and (old->field) is distinct from (p_payload->field) then raise exception 'Pending registration differs; contact the club to update it';end if;end loop;
   if ((old->'consent_snapshot')-'accepted_at') is distinct from (p_policy-'accepted_at') then raise exception 'Consent or policy changed; contact the club to update the pending registration';end if;
   return old;end if;
  raise exception 'An existing entry needs review; do not register or pay again';
 end if;
 ref:='HPCC-'||case when p_kind='membership' then 'M-' else 'T-' end||upper(replace(p_identity::text,'-',''));
 payload:=p_payload||jsonb_build_object('id',p_identity,'payment_method','bank_transfer','payment_status','pending_payment','bank_reference',ref,'bank_instructions',p_instructions||jsonb_build_object('reference',ref),'consent_snapshot',p_policy);
 if p_kind='membership' then
 insert into public.club_memberships select (jsonb_populate_record(null::public.club_memberships,payload||jsonb_build_object('membership_status','pending_payment','created_at',now(),'updated_at',now()))).* returning to_jsonb(club_memberships.*) into saved;
 else
 insert into public.tournament_registrations select (jsonb_populate_record(null::public.tournament_registrations,payload||jsonb_build_object('registration_status','pending_payment','created_at',now(),'updated_at',now()))).* returning to_jsonb(tournament_registrations.*) into saved;
 end if;
 return saved;
end $$;
create or replace function public.hpcc_approve_payment(p_kind text,p_id uuid,p_actor uuid,p_method text,p_note text,p_full boolean,p_checkout text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; tab text; amount int; actor_name text; saved jsonb; opt jsonb; start_day date; end_day date; chosen_end date; evt public.tournaments%rowtype;
begin
 select coalesce(full_name,email) into actor_name from public.profiles where id=p_actor and is_active and role in ('admin','super_admin');
 if not found then raise exception 'Admin or Super Admin required';end if;
 if coalesce(p_kind,'') not in ('membership','tournament') or coalesce(p_method,'') not in ('bank_transfer','cash','manual_verified') or not coalesce(p_full,false) or length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 then raise exception 'Full payment acknowledgement, method and reference/note required';end if;
 if p_kind='membership' and p_method<>'bank_transfer' then raise exception 'Membership approval is for received bank transfers';end if;
 tab:=case when p_kind='membership' then 'club_memberships' else 'tournament_registrations' end;
 execute format('select to_jsonb(r) from public.%I r where id=$1 for update',tab) into r using p_id;
 if r is null then raise exception 'Registration missing';end if;
 if exists(select 1 from public.audit_logs where entity_id=p_id and action='payment_approved') and r->>'payment_status'='paid' and coalesce(r->>'registration_status',r->>'membership_status')<>'cancelled' then return r||jsonb_build_object('approval_reused',true,'approved_by',(select summary->>'approver' from public.audit_logs where entity_id=p_id and action='payment_approved' order by created_at limit 1));end if;
 if r->>'payment_status' not in ('pending_payment','failed','expired') or coalesce(r->>'registration_status',r->>'membership_status')='cancelled' then raise exception 'Paid, refunded or cancelled entry cannot be approved';end if;
 if p_kind='membership' and r->>'payment_method'<>'bank_transfer' then raise exception 'Use Stripe verification';end if;
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
end $$;
revoke all on function public.hpcc_claim_bank(text,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.hpcc_approve_payment(text,uuid,uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.hpcc_claim_bank(text,uuid,jsonb,jsonb,jsonb),public.hpcc_approve_payment(text,uuid,uuid,text,text,boolean,text) to service_role;
commit;
