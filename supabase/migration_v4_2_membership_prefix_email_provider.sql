-- =====================================================
-- v4.2 - Membership prefix + admin selectable email provider
-- Howick-Pakuranga Chess Club
-- =====================================================

alter table public.club_settings add column if not exists membership_id_prefix text default 'HPCC';
alter table public.club_settings add column if not exists email_provider text default 'smtp';
alter table public.club_settings add column if not exists resend_api_key text;
alter table public.club_settings add column if not exists smtp_host text default 'smtp-relay.brevo.com';
alter table public.club_settings add column if not exists smtp_port int default 587;
alter table public.club_settings add column if not exists smtp_secure boolean default false;
alter table public.club_settings add column if not exists smtp_user text;
alter table public.club_settings add column if not exists smtp_pass text;
alter table public.club_settings add column if not exists club_from_email text;
alter table public.club_settings add column if not exists club_from_name text default 'Howick-Pakuranga Chess Club';
alter table public.club_settings add column if not exists club_reply_to_email text;

update public.club_settings
set
  membership_id_prefix = coalesce(nullif(membership_id_prefix, ''), 'HPCC'),
  email_provider = coalesce(nullif(email_provider, ''), 'smtp'),
  smtp_host = coalesce(nullif(smtp_host, ''), 'smtp-relay.brevo.com'),
  smtp_port = coalesce(smtp_port, 587),
  smtp_secure = coalesce(smtp_secure, false),
  club_from_name = coalesce(nullif(club_from_name, ''), 'Howick-Pakuranga Chess Club')
where id = 'default';

create sequence if not exists membership_id_seq start with 1001 increment by 1;
create or replace function public.generate_membership_id()
returns text language plpgsql as $$
declare
  prefix text;
begin
  select upper(regexp_replace(coalesce(membership_id_prefix, 'HPCC'), '[^A-Za-z]', '', 'g'))
    into prefix
  from public.club_settings
  where id = 'default';
  prefix := left(coalesce(nullif(prefix, ''), 'HPCC'), 4);
  return prefix || lpad(nextval('membership_id_seq')::text, 5, '0');
end;
$$;
