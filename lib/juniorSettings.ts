import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { JUNIOR_CONFIG_SLUG, juniorDefaults, validateJuniorConfig } from "@/lib/juniorConfig";
export async function getJuniorSettings() {
 const s = createSupabaseServiceClient();
 const { data, error } = await s.from("news_posts").select("content").eq("slug", JUNIOR_CONFIG_SLUG).maybeSingle();
 if (error) throw new Error(error.message);
 if (!data) return juniorDefaults;
 return validateJuniorConfig(JSON.parse(data.content));
}
