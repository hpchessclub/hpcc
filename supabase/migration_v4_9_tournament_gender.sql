-- Additive and repeatable. Inspect HPCC's actual schema and take a backup first.
-- Existing registrations and missing historical gender values are preserved.
begin;
alter table public.tournament_registrations add column if not exists gender text;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.tournament_registrations'::regclass and conname='hpcc_registration_gender_values') then
  alter table public.tournament_registrations add constraint hpcc_registration_gender_values
   check(gender is null or gender in ('Male','Female','Non-binary','Prefer not to say','Other')) not valid;
 end if;
end $$;
comment on column public.tournament_registrations.gender is 'Player supplied gender. Historical missing values remain null.';
commit;
