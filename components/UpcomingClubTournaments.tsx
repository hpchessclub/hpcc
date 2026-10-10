const clubEvents = [
  { title: "Booth Shield", start: "2026-10-13", end: "2026-11-24", date: "Tuesday 13 October – Tuesday 24 November 2026", vega: "https://www.vegaresults.com/vega/9144" },
  { title: "Gentil Knight Blitz Championship", start: "2026-12-01", end: "2026-12-01", date: "Starts Tuesday 1 December 2026", vega: null }
];

export default function UpcomingClubTournaments() {
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
        {event.vega ? <a href={event.vega} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 py-2">Vega players, pairings & results ↗</a> : <p className="mt-4 text-sm text-stone-600">The Vega link will appear once available.</p>}
      </article>)}
    </div>
  </section>;
}
