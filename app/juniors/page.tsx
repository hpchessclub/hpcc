import PageShell from "@/components/PageShell";
import JuniorContent from "@/components/JuniorContent";
import { getJuniorSettings } from "@/lib/juniorSettings";
import { juniorDefaults } from "@/lib/juniorConfig";
export const dynamic = "force-dynamic";
export const metadata = { title: "Junior Chess | Howick-Pakuranga Chess Club", description: "Tuesday Junior Hour at HPCC: beginner lessons, games, ladder pairings and a pathway into club chess." };
export default async function JuniorsPage() {
 let config = juniorDefaults;
 try { config = await getJuniorSettings(); } catch (error) { console.error("Junior settings unavailable", error instanceof Error ? error.message : "Unknown error"); }
 return <PageShell><JuniorContent config={config}/></PageShell>;
}
