-- Run in HPCC Supabase only: nrnlbgwgfknwpwpuhwri.
-- Adds/updates only the two named club events; preserves registrations.
begin;
insert into public.tournaments
(title,slug,tournament_year,date_display,start_date,end_date,tournament_type,status,entry_fee_cents,require_payment,allow_public_registration,allow_non_members,show_in_calendar,show_public_entries,vega_url)
values
('Booth Shield','booth-shield-2026',2026,'13 October – 24 November 2026; session time to be confirmed','2026-10-13 00:00:00+13','2026-11-24 23:59:59+13','club_calendar','open',0,false,true,false,true,true,'https://www.vegaresults.com/vega/9144'),
('Gentil Knight Blitz Championship','gentil-knight-blitz-2026',2026,'Tuesday 1 December 2026; session time to be confirmed','2026-12-01 00:00:00+13','2026-12-01 23:59:59+13','club_calendar','open',0,false,true,false,true,true,null)
on conflict (slug) do update set
 tournament_type='club_calendar',status='open',entry_fee_cents=0,category_options='[]'::jsonb,
 require_payment=false,allow_public_registration=true,allow_non_members=false,
 show_in_calendar=true,vega_url=coalesce(excluded.vega_url,tournaments.vega_url),updated_at=now();
commit;
select id,title,slug,status,entry_fee_cents,require_payment,allow_public_registration from public.tournaments where slug in ('booth-shield-2026','gentil-knight-blitz-2026');
