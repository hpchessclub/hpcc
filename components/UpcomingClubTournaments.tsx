import { createSupabaseServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
const clubEvents = [
  { title: "Booth Shield", slug: "booth-shield-2026", start: "2026-10-13", end: "2026-11-24", date: "Tuesday 13 October – Tuesday 24 November 2026", vega: "https://www.vegaresults.com/vega/9144" },
  { title: "Gentil Knight Blitz Championship", slug: "gentil-knight-blitz-2026", start: "2026-12-01", end: "2026-12-01", date: "Starts Tuesday 1 December 2026", vega: null }
];

export default async function UpcomingClubTournaments() {
  const { data: records } = await createSupabaseServiceClient().from("tournaments").select("slug,status,allow_public_registration,entry_fee_cents,require_payment,tournament_type,show_public_entries").in("slug", clubEvents.map(event => event.slug));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const events = clubEvents.filter(event => event.end >= today);
  if (!events.length) return null;
  return <section aria-labelledby="upcoming-club-heading" className="mb-6">
    <h3 id="upcoming-club-heading" className="mb-4 text-xl font-bold">2026 club tournaments</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map(event => <article key={event.title} className="card border-t-4 border-t-[#5C914E] p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-hpcc-blue">{event.start > today ? "Coming up" : "In progress"}</p>
        <h4 className="mt-2 text-lg font-bold">{event.title}</h4>
        <p className="mt-3 text-sm font-semibold">{event.date}</p>
        {records?.some(record => record.slug === event.slug && record.status === "open" && record.allow_public_registration) && <Link href={`/tournaments/${event.slug}/register`} className="btn-primary mt-4 mr-2 py-2">Register</Link>}
        {records?.some(record=>record.slug===event.slug&&record.show_public_entries&&['open','closed','completed'].includes(record.status))&&<Link href={`/tournaments/${event.slug}/entries`} className="btn-secondary mt-4 mr-2 py-2">View Entries</Link>}
        <Link href={`/absence?tournament=${encodeURIComponent(event.title)}`} aria-label={`Report absence for ${event.title}`} className="btn-secondary mt-4 mr-2 py-2">Report absence</Link>
        {event.vega ? <a href={event.vega} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 py-2">Vega players, pairings & results ↗</a> : <p className="mt-4 text-sm text-stone-600">The Vega link will appear once available.</p>}
      </article>)}
    </div>
  </section>;
}
