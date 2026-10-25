import { createSupabaseServiceClient } from "@/lib/supabase/service";
import TournamentCard from "@/components/TournamentCard";
const clubEvents = [
  { title: "Booth Shield", slug: "booth-shield-2026", start: "2026-10-13", end: "2026-11-24", date: "Tuesday 13 October – Tuesday 24 November 2026", vega: "https://www.vegaresults.com/vega/9144" },
  { title: "Gentil Knight Blitz Championship", slug: "gentil-knight-blitz-2026", start: "2026-12-01", end: "2026-12-01", date: "Starts Tuesday 1 December 2026", vega: null }
];

export default async function UpcomingClubTournaments() {
  const { data: records } = await createSupabaseServiceClient().from("tournaments").select("*").in("slug", clubEvents.map(event => event.slug));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const events = clubEvents.filter(event => event.end >= today);
  if (!events.length) return null;
  return <section aria-labelledby="upcoming-club-heading" className="mb-6">
    <h3 id="upcoming-club-heading" className="mb-4 text-xl font-bold">2026 club tournaments</h3>
    <div className="grid gap-4">
      {events.map(event=>{
        const stored=records?.find(record=>record.slug===event.slug);
        const tournament={...stored,title:stored?.title||event.title,slug:event.slug,date_display:stored?.date_display||event.date,vega_url:stored?.vega_url||event.vega,tournament_type:stored?.tournament_type||"club_calendar"};
        return <TournamentCard key={event.slug} tournament={tournament} phase={event.start>today?"Coming up":"In progress"}/>;
      })}
    </div>
  </section>;
}
