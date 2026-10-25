import NzcfMembershipNote from "@/components/NzcfMembershipNote";
// Tournament data is managed in admin and must be read on every request.
export const dynamic = "force-dynamic";

import TournamentCard from "@/components/TournamentCard";
import PageShell from "@/components/PageShell";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function yearOf(t:any){ return Number(t.tournament_year || (t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear())); }

export default async function TournamentsPage() {
  const service = createSupabaseServiceClient();
  const { data: tournaments } = await service
    .from("tournaments")
    .select("*")
    .in("status", ["open", "closed"])
    .order("start_date", { ascending: true });
  const byYear = new Map<number, any[]>();
  for (const t of tournaments || []) {
    const y = yearOf(t);
    byYear.set(y, [...(byYear.get(y)||[]), t]);
  }
  const years = Array.from(byYear.keys()).sort((a,b)=>b-a);

  return <PageShell><main className="container-page py-12"><NzcfMembershipNote/>
    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-soft">
      <h1 className="text-4xl font-extrabold">Tournaments</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">Upcoming and current club tournaments and general/open events. Completed tournaments are moved to the Results page.</p>
      <p className="mt-2 text-stone-700">See also <Link href="/calendar" className="font-semibold underline">Calendar</Link> for the full yearly list.</p>

      <div className="mt-10 space-y-12">
        {years.map((year) => <section key={year}>
          <h2 className="mb-6 text-3xl font-extrabold">{year} Tournaments</h2>
          <div className="space-y-4">
            {(byYear.get(year)||[]).map((t:any)=><TournamentCard key={t.id} tournament={t}/>)}
          </div>
        </section>)}
        {years.length===0 && <div className="rounded-xl bg-stone-50 p-6 text-stone-600">Additional tournaments will appear here when published.</div>}
      </div>
    </div>
  </main></PageShell>
}
