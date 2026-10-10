import PageShell from "@/components/PageShell";
import InterschoolContent from "@/components/InterschoolContent";
import { getInterschoolSettings } from "@/lib/interschoolSettings";
import { interschoolDefaults } from "@/lib/interschoolConfig";
export const dynamic = "force-dynamic";
export const metadata = {title:"Interschool Chess | HPCC"};
export default async function InterschoolPage() {
 let config = interschoolDefaults;
 try { config = await getInterschoolSettings(); } catch (error) { console.error("Interschool settings unavailable", error instanceof Error ? error.message : "Unknown error"); }
 return <PageShell><InterschoolContent config={config}/></PageShell>;
}
