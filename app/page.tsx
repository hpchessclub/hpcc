import ClubContacts from "@/components/ClubContacts";
import {readClubPublicSettings} from "@/lib/clubPublicSettings";
import NzcfMembershipNote from "@/components/NzcfMembershipNote";
// Tournament data is managed in admin and must be read on every request.
export const dynamic = "force-dynamic";

import { getPoppiesSettings } from "@/lib/poppiesSettings";
import { poppiesDefaults } from "@/lib/poppiesConfig";
import { getInterschoolSettings } from "@/lib/interschoolSettings";
import { interschoolDefaults } from "@/lib/interschoolConfig";
import { mergeHpccNews } from "@/lib/hpccNewsAnnouncements";
import PageShell from "@/components/PageShell";
import Hero from "@/components/Hero";
import FeatureStrip from "@/components/FeatureStrip";
import StayConnected from "@/components/StayConnected";
import UpcomingClubTournaments from "@/components/UpcomingClubTournaments";
import HomeTournamentsList from "@/components/HomeTournamentsList";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  let poppies = poppiesDefaults;
  try { poppies = await getPoppiesSettings(); } catch {}
  let interschools = interschoolDefaults;
  try { interschools = await getInterschoolSettings(); } catch {}
  const service = createSupabaseServiceClient();
  const [{ data: tournaments }, { data: storedNews }, { data: settings }] = await Promise.all([
    service.from("tournaments").select("*").eq("tournament_type", "general_open").in("status", ["open", "closed"]).order("start_date", { ascending: true }).limit(9),
    service.from("news_posts").select("*").order("published_at", { ascending: false }),
    service.from("club_settings").select("*").eq("id", "default").maybeSingle()
  ]);
  const news = mergeHpccNews(storedNews || []).slice(0, 3);
  const publicSettings=await readClubPublicSettings(service,settings||{});
  const mapAddress = settings?.club_address || "East Auckland, New Zealand";
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`;

  return <PageShell>
    <Hero />

    <main className="hpcc-home container-page py-10">
      <FeatureStrip />
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-wide">Upcoming tournaments</h2>
              <p className="mt-1 text-sm text-stone-600">Discover public events. Visit the calendar for club activities and member events.</p>
            </div>
            <Link href="/tournaments" className="shrink-0 text-sm font-bold text-black">View All</Link>
          </div>
          <NzcfMembershipNote/><UpcomingClubTournaments />
          {(tournaments || []).length > 0 ? <HomeTournamentsList tournaments={tournaments || []} /> : <div className="card p-5 text-sm text-stone-600">General/open tournaments will appear here when published.</div>}
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold uppercase tracking-wide">Latest News</h2>
            <Link href="/news" className="text-sm font-bold text-black">View All</Link>
          </div>
          <div className="space-y-4">
            {(news || []).map((n:any)=><Link key={n.id} href={`/news/${n.slug}`} className="card flex gap-3 p-3 hover:border-black">
              {n.image_url ? <img src={n.image_url} alt={n.title} className="h-20 w-24 rounded-lg object-cover" /> : null}
              <div><h3 className="font-bold">{n.title}</h3><p className="text-xs text-stone-500">{formatDate(n.published_at)}</p><p className="mt-1 line-clamp-2 text-sm text-stone-600">{n.summary}</p></div>
            </Link>)}
            {(!news || news.length === 0) && <div className="card p-5 text-sm text-stone-600">No news has been published yet.</div>}
          </div>
        </section>
      </div>
      <section className="mt-12" aria-labelledby="programmes-heading">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Play. Learn. Belong.</p><h2 id="programmes-heading" className="mb-4 mt-2 text-2xl font-bold tracking-tight">Find your place in the game.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="card flex h-full flex-col border-t-4 border-t-[#5C914E] bg-hpcc-accent p-5 text-hpcc-navy"><span className="text-3xl text-hpcc-blue" aria-hidden="true">♞</span><p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-hpcc-blue">Young players</p><h3 className="mt-2 text-lg font-bold">Junior Chess</h3><p className="mt-3 text-sm leading-6 text-hpcc-navy/80">Learn chess, enjoy games and build confidence at our Tuesday Junior Hour. Explore lessons, the junior ladder and a pathway into club chess.</p><div className="flex-1 pb-4"/><Link href="/juniors" className="btn-secondary mt-auto self-start py-2">Explore Junior Chess ↗</Link></article>
          <article id="interschool-chess" className="card flex h-full scroll-mt-24 flex-col border-t-4 border-t-[#5C914E] bg-[#E6F3DF] p-5"><span className="text-3xl text-stone-700" aria-hidden="true">♜</span><p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-stone-600">For schools</p><h3 className="mt-2 text-lg font-bold">Interschool Chess</h3><p className="mt-3 text-sm leading-6 text-stone-700">{interschools.cardText}</p><p className="mt-2 text-xs font-semibold text-stone-700">Primary · Intermediate · Secondary</p><div className="flex-1 pb-4"/><Link href="/interschools" className="btn-secondary mt-auto self-start py-2">View interschool reports ↗</Link></article>
          <article id="poppy-chess" className="card flex h-full scroll-mt-24 flex-col border-t-4 border-t-[#5C914E] bg-hpcc-pale p-5"><span className="text-3xl text-stone-600" aria-hidden="true">♟</span><p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-stone-500">Our community</p><h3 className="mt-2 text-lg font-bold">{poppies.title}</h3><p className="mt-3 text-sm leading-6 text-stone-700">{poppies.cardText}</p><div className="flex-1 pb-4"/><Link href="/poppies" className="btn-secondary mt-auto self-start py-2">View yearly events & results ↗</Link></article>
        </div>
      </section>
      <nav aria-label="Results and gallery" className="mt-10 flex flex-wrap gap-4"><Link className="btn-secondary" href="/results">Tournament results ↗</Link><Link className="btn-secondary" href="/photo-gallery">Photo gallery ↗</Link></nav>
      <ClubContacts settings={publicSettings}/>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-extrabold">Find Us</h2>
          <p className="mt-3 text-stone-700">{mapAddress}</p>
          <p className="mt-3 text-sm text-stone-500">Visit us in East Auckland. Contact the club for session details before your first visit.</p>
          <Link href="/contact" className="btn-secondary mt-5">Contact Us</Link>
        </div>
        <div className="card overflow-hidden">
          <iframe title="Club location map" src={mapSrc} className="h-80 w-full border-0" loading="lazy" />
        </div>
      </section>
    </main>
    <StayConnected settings={settings} />
  </PageShell>
}
