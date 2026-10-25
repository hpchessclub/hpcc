import {reminderCutoff} from "@/lib/paymentReminder";
import NzcfMembershipNote from "@/components/NzcfMembershipNote";
export const dynamic = "force-dynamic";
import PageShell from "@/components/PageShell";
import TournamentRegistrationForm from "@/components/TournamentRegistrationForm";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = createSupabaseServiceClient();
  const { data: tournament } = await service.from("tournaments").select("*").eq("slug", slug).maybeSingle();
  if (!tournament || tournament.status !== "open" || (!tournament.allow_public_registration && tournament.tournament_type !== "club_calendar")) notFound();
  if(tournament.registration_close_at&&reminderCutoff({registration_close_at:tournament.registration_close_at})<=Date.now())notFound();
  return <PageShell><main className="container-page py-12"><NzcfMembershipNote/><TournamentRegistrationForm tournament={tournament} /></main></PageShell>
}
