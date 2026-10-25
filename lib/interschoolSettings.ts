import {loadProgrammeRecords} from "@/lib/programmeRecords";
import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { INTERSCHOOL_CONFIG_SLUG, interschoolDefaults, validateInterschoolConfig, legacyInterschoolSummary } from "@/lib/interschoolConfig";
export async function getInterschoolSettings() {
 const {data,error} = await createSupabaseServiceClient().from("news_posts").select("content").eq("slug", INTERSCHOOL_CONFIG_SLUG).maybeSingle();
 if (error) throw new Error(error.message);
 if (!data) return interschoolDefaults;
 const saved=JSON.parse(data.content);
 const years=await loadProgrammeRecords(INTERSCHOOL_CONFIG_SLUG);
 const config = validateInterschoolConfig(years.length?{...saved,events:years}:saved);
 // Upgrade only the previous unedited summary; preserve administrator-written content.
 return config.content === legacyInterschoolSummary ? {...config, content: interschoolDefaults.content,events:config.events?.map(e=>({...e,sections:e.sections.map(s=>s.content===legacyInterschoolSummary?{...s,content:interschoolDefaults.content}:s)}))} : config;
}
