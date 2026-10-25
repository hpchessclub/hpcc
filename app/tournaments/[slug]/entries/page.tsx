export const dynamic = "force-dynamic";
import Link from "next/link";
import NzcfMembershipNote from "@/components/NzcfMembershipNote";
import {readPublicPlayers,publicEntriesEnabled} from "@/lib/publicPlayers";
import { PLAYER_SORT_OPTIONS, playerSort, sortPublicPlayers } from "@/lib/publicPlayerSorting";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { clubAbbreviation, fideProfileUrl, publicPlayerTitles, publicGender } from "@/lib/publicPlayerDisplay";

export default async function EntriesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string | string[] }> }) {
  const { slug } = await params;
  const sort = playerSort((await searchParams).sort);
  const service = createSupabaseServiceClient();
  const { data: tournament } = await service.from("tournaments").select("*").eq("slug", slug).maybeSingle();
  if (!publicEntriesEnabled(tournament)) notFound();
  let entries;try{entries=await readPublicPlayers(service,tournament.id);}catch{return <PageShell><main className="container-page py-12"><h1 className="text-2xl font-bold">Registered players</h1><p role="alert" className="mt-4">Registered players are temporarily unavailable. Please try again shortly.</p></main></PageShell>;}
  const players = sortPublicPlayers(entries || [], sort);
  const titles = await publicPlayerTitles(players);
  return <PageShell><main className="container-page py-12"><NzcfMembershipNote/><div className="card overflow-hidden">
    <div className="bg-hpcc-blue p-6 text-white"><h1 className="text-3xl font-extrabold">{tournament.title} - Registered Players</h1><p className="text-green-100">Only paid and confirmed entries are displayed publicly. Tentative bank-transfer entries are excluded.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-semibold">Sort by</span>{PLAYER_SORT_OPTIONS.map(option => <Link key={option.value} href={`?sort=${option.value}`} aria-current={sort === option.value ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${sort === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>{option.label}</Link>)}</div><a href={`/api/tournaments/${encodeURIComponent(slug)}/players/export?sort=${sort}`} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800">Export to Excel</a></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-100 text-left"><tr>{["SNO", "Title", "Name", "Gender", "FIDE ID", "FIDE Rating", "NZCF Rating", "Club"].map(h => <th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead>
      <tbody>{players.length===0&&<tr><td colSpan={8} className="p-5">No paid and confirmed players are available yet.</td></tr>}{players.map((e: any, i: number) => {
        const id = String(e.fide_id || "").trim();
        const profile = fideProfileUrl(id);
        const club = e.club_name || e.school_name || "";
        return <tr key={`${e.first_name}-${e.last_name}-${i}`} className="border-t border-slate-300 odd:bg-white even:bg-hpcc-pale hover:bg-green-50">
          <td className="p-3">{i + 1}</td><td className="p-3 font-semibold">{titles[id] || ""}</td><td className="p-3 font-bold">{e.first_name} {e.last_name}</td>
          <td className="p-3">{publicGender(e.gender)}</td>
          <td className="p-3">{profile ? <a href={profile} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 underline underline-offset-2 hover:text-blue-600 focus-visible:outline focus-visible:outline-2" aria-label={`FIDE profile for ${e.first_name} ${e.last_name}`}>{id}</a> : ""}</td>
          <td className="p-3 tabular-nums">{e.fide_rating ?? ""}</td><td className="p-3 tabular-nums">{e.nzcf_rating ?? ""}</td>
          <td className="p-3"><abbr title={club} className="cursor-help no-underline">{clubAbbreviation(club)}</abbr></td>
        </tr>;
      })}</tbody></table></div></div></main></PageShell>;
}
