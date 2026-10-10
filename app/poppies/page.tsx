import PageShell from "@/components/PageShell";
import PoppiesContent from "@/components/PoppiesContent";
import {getPoppiesSettings} from "@/lib/poppiesSettings";
import {poppiesDefaults} from "@/lib/poppiesConfig";
export const dynamic="force-dynamic";
export const metadata={title:"Poppies Chess Challenge | HPCC"};
export default async function Page(){let config=poppiesDefaults;try{config=await getPoppiesSettings();}catch(error){console.error("Poppies settings unavailable",error instanceof Error?error.message:"Unknown error");}return <PageShell><PoppiesContent config={config}/></PageShell>}
