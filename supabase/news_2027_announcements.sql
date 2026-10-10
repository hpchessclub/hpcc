-- Run only in HPCC Supabase. Preserve existing edited articles.
begin;
insert into public.news_posts (title,slug,summary,content,published_at,is_published) values
('2027 Oceania Zonal Chess Championships','oceania-zonal-2027','Oceania’s Open and Women’s Zonal championships take place in Christchurch from 22–27 January 2027, alongside a Blitz championship.','The 2027 Oceania Zonal Chess Championships will take place in Christchurch, New Zealand, from **22–27 January 2027**.

The programme includes the Open Zonal, Women’s Zonal and a Blitz championship.

Canterbury Chess Club is organising the event for the New Zealand Chess Federation, Oceania Chess Confederation and FIDE.

Players should check the official event website for current entry requirements, availability, fees and schedules. Registration is handled by the event organisers.

[Official event website and registration information](https://sites.google.com/view/oceaniazonal2027)','2026-10-11T00:48:00+13:00',true),
('Latvian Tournament — March 2027','latvian-tournament-march-2027','HPCC’s Latvian Tournament is planned for March 2027. Exact dates and registration details will be announced.','HPCC’s **Latvian Tournament is planned for March 2027**.

Please keep an eye on this website for updates. Exact dates, venue, tournament format, entry fees and registration information will be announced once confirmed.

For enquiries, [contact HPCC](/contact).','2026-10-11T00:47:00+13:00',true)
on conflict (slug) do nothing;
commit;
