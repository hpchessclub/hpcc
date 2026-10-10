import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { INTERSCHOOL_CONFIG_SLUG, interschoolDefaults, validateInterschoolConfig } from "@/lib/interschoolConfig";
export async function getInterschoolSettings() {
 const {data,error} = await createSupabaseServiceClient().from("news_posts").select("content").eq("slug", INTERSCHOOL_CONFIG_SLUG).maybeSingle();
 if (error) throw new Error(error.message);
 return data ? validateInterschoolConfig(JSON.parse(data.content)) : interschoolDefaults;
}
