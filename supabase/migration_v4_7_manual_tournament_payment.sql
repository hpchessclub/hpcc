-- HPCC only. Add an atomic manual payment approval function; preserve all existing data.
-- Review against the current HPCC schema before running in the HPCC SQL Editor.
begin;
create or replace function public.confirm_manual_tournament_payment(p_registration_id uuid,p_actor_id uuid,p_method text,p_note text,p_checkout text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.tournament_registrations%rowtype; a public.profiles%rowtype;
begin
 select * into a from public.profiles where id=p_actor_id and is_active=true and role in ('admin','super_admin');
 if not found then raise exception 'Admin or Super Admin approval required'; end if;
 if p_method not in ('cash','bank_transfer','manual_verified') or length(trim(coalesce(p_note,'')))<3 or length(p_note)>2000 then raise exception 'Payment method and reference or note are required'; end if;
 select * into r from public.tournament_registrations where id=p_registration_id for update;
 if not found then raise exception 'Registration not found'; end if;
 if r.stripe_checkout_session_id is distinct from p_checkout then raise exception 'Checkout changed; refresh before confirming'; end if;
 if r.payment_status not in ('pending_payment','failed','expired') or r.registration_status='cancelled' then raise exception 'Paid, refunded or cancelled registrations cannot be manually confirmed'; end if;
 if r.stripe_payment_intent_id is not null then raise exception 'Use Stripe verification for a linked Stripe payment'; end if;
 if coalesce(r.entry_fee_cents,0)<=0 then raise exception 'No payable fee; do not record a manual payment'; end if;
 if exists(select 1 from public.payment_records where reference_id=r.id and payment_type='tournament') then raise exception 'A payment record exists; review it before approving'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary) values(p_actor_id,'manual_payment_confirmed','tournament_registration',r.id,jsonb_build_object('method',p_method,'reference_or_note',trim(p_note),'amount_cents',r.entry_fee_cents,'approved_by',coalesce(a.full_name,a.email),'approved_at',now()));
 insert into public.payment_records(payment_type,reference_id,email,amount_cents,status) values('tournament',r.id,r.email,r.entry_fee_cents,'paid');
 update public.tournament_registrations set payment_status='paid',registration_status='confirmed',updated_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,text) to service_role;
commit;
