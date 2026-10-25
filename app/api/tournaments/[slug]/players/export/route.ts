import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { publicPlayerTitles } from "@/lib/publicPlayerDisplay";
import {readPublicPlayers,publicEntriesEnabled} from "@/lib/publicPlayers";
import { sortPublicPlayers } from "@/lib/publicPlayerSorting";
import { publicPlayersWorkbook } from "@/lib/publicPlayersExcel";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const s = createSupabaseServiceClient();
    const { data: tournament, error } = await s.from("tournaments").select("id,title,status,show_public_entries").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!publicEntriesEnabled(tournament)) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    // Public export deliberately excludes contacts, DOB and payment references.
    const entries=await readPublicPlayers(s,tournament.id);
    const players=sortPublicPlayers(entries,new URL(req.url).searchParams.get("sort"));
    const titles=await publicPlayerTitles(players);
    const buffer = await publicPlayersWorkbook(tournament.title, players, titles);
    const filename = `${slug.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) || "tournament"}-registered-players.xlsx`;
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store", "X-Robots-Tag":"noindex, nofollow" } });
  } catch { return NextResponse.json({ error: "Unable to export players. Please try again." }, { status: 503 }); }
}

