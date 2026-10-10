import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { INTERSCHOOL_CONFIG_SLUG, interschoolDefaults, validateInterschoolConfig, legacyInterschoolSummary } from "@/lib/interschoolConfig";
export async function getInterschoolSettings() {
 const {data,error} = await createSupabaseServiceClient().from("news_posts").select("content").eq("slug", INTERSCHOOL_CONFIG_SLUG).maybeSingle();
 if (error) throw new Error(error.message);
 if (!data) return interschoolDefaults;
 const config = validateInterschoolConfig(JSON.parse(data.content));
 // Upgrade only the previous unedited summary; preserve administrator-written content.
 return config.content === legacyInterschoolSummary ? {...config, content: interschoolDefaults.content} : config;
}
