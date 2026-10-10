// Tournament data is managed in admin and must be read on every request.
export const dynamic = "force-dynamic";

import { getPoppiesSettings } from "@/lib/poppiesSettings";
import { poppiesDefaults } from "@/lib/poppiesConfig";
import { getInterschoolSettings } from "@/lib/interschoolSettings";
import { interschoolDefaults } from "@/lib/interschoolConfig";
import { mergeHpccNews } from "@/lib/hpccNewsAnnouncements";
import GalleryAlbums from "@/components/GalleryAlbums";
import { galleryAlbums } from "@/lib/gallery";
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
  const [{ data: tournaments }, { data: storedNews }, { data: settings }, { data: galleryPhotos }, {data: results, error: resultsError}] = await Promise.all([
    service.from("tournaments").select("*").eq("tournament_type", "general_open").in("status", ["open", "closed"]).order("start_date", { ascending: true }).limit(9),
    service.from("news_posts").select("*").order("published_at", { ascending: false }),
    service.from("club_settings").select("*").eq("id", "default").maybeSingle(),
    service.from("gallery_photos").select("*").eq("is_published", true).order("event_date", { ascending: false }).order("created_at", { ascending: false }),
    service.from("tournaments").select("id,title,tournament_year,first_place_name,result_summary,vega_url,winner_photo_url,start_date").or("first_place_name.not.is.null,result_summary.not.is.null").order("tournament_year", {ascending:false, nullsFirst:false}).order("start_date", {ascending:false, nullsFirst:false}).order("created_at", {ascending:false}).limit(6)
  ]);
  const news = mergeHpccNews(storedNews || []).slice(0, 3);
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
          <UpcomingClubTournaments />
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
      <section className="mt-12" aria-labelledby="home-results-heading">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="home-results-heading" className="font-serif text-2xl font-bold">Latest Tournament Results</h2><Link href="/results" className="text-sm font-bold underline">View All Results</Link></div>
        {results?.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map(result=><article key={result.id} className="card p-5">
          {result.winner_photo_url && <img src={result.winner_photo_url} alt={`${result.title} winner`} className="mb-4 h-40 w-full rounded-lg object-cover"/>}
          {result.tournament_year && <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{result.tournament_year} season</p>}
          <h3 className="mt-2 font-serif text-xl font-bold">{result.title}</h3>
          {result.first_place_name && <p className="mt-3 text-sm"><b>Winner(s):</b> {result.first_place_name}</p>}
          {result.result_summary && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">{result.result_summary}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold"><Link href="/results" className="underline">Result details</Link>{result.vega_url && <a href={result.vega_url} target="_blank" rel="noreferrer" className="underline">{result.vega_url.includes('vegaresults.com')?'Vega results':'Full results'}</a>}</div>
        </article>)}</div> : <p className="card p-5 text-sm text-stone-600">{resultsError ? "Results are temporarily unavailable. Please try again shortly." : "Tournament results will appear here when added in admin."}</p>}
      </section>
      <section className="mt-12" aria-labelledby="programmes-heading">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Play. Learn. Belong.</p><h2 id="programmes-heading" className="mb-6 mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Find your place in the game.</h2>
        <div className="grid overflow-hidden rounded-2xl md:grid-cols-3">
          <article className="bg-hpcc-accent p-8 text-hpcc-navy md:p-9"><span className="text-6xl text-hpcc-blue" aria-hidden="true">♞</span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-hpcc-blue">Young players</p><h3 className="mt-3 text-3xl font-extrabold">Junior Chess</h3><p className="mt-4 leading-7 text-hpcc-navy/80">Learn chess, enjoy games and build confidence at our Tuesday Junior Hour. Explore lessons, the junior ladder and a pathway into club chess.</p><Link href="/juniors" className="mt-7 inline-flex rounded-full border border-hpcc-navy/30 px-5 py-3 text-sm font-bold hover:bg-white/10">Explore Junior Chess ↗</Link></article>
          <article id="interschool-chess" className="scroll-mt-24 bg-[#E6F3DF] p-8 md:p-9"><span className="text-6xl text-stone-700" aria-hidden="true">♜</span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-stone-600">For schools</p><h3 className="mt-3 text-3xl font-extrabold">Interschool Chess</h3><p className="mt-4 leading-7 text-stone-700">{interschools.cardText}</p><p className="mt-3 text-sm font-semibold text-stone-700">Primary · Intermediate · Secondary</p><Link href="/interschools" className="mt-7 inline-flex rounded-full border border-black/30 px-5 py-3 text-sm font-bold hover:bg-white/50">View interschool reports ↗</Link></article>
          <article id="poppy-chess" className="scroll-mt-24 bg-hpcc-pale p-8 md:p-9"><span className="text-6xl text-stone-600" aria-hidden="true">♟</span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Our community</p><h3 className="mt-3 text-3xl font-extrabold">{poppies.title}</h3><p className="mt-4 leading-7 text-stone-700">{poppies.cardText}</p><Link href="/poppies" className="mt-7 inline-flex rounded-full border border-black/30 px-5 py-3 text-sm font-bold hover:bg-white">View yearly events & results ↗</Link></article>
        </div>
      </section>
      <section className="mt-10"><div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-extrabold">Event Photo Gallery</h2><Link href="/photo-gallery" className="font-bold">View All Events</Link></div>{galleryPhotos?.length ? <GalleryAlbums albums={galleryAlbums(galleryPhotos).slice(0, 3)} /> : <p className="card mt-5 p-5 text-stone-600">Event albums will appear here when photos are published.</p>}</section>
      <section className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-hpcc-accent p-8 text-hpcc-navy md:p-12"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-hpcc-blue">Make your next move</p><h2 className="mt-3 text-3xl font-extrabold">Chess brings us together.</h2><p className="mt-3 text-hpcc-navy/75">Find your member record, renew or become part of HPCC.</p></div><Link href="/join#membership-search" className="rounded-full bg-hpcc-navy px-6 py-3 font-bold text-white">Join our community ↗</Link></section>
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
