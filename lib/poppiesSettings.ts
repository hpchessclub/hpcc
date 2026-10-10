import "server-only";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {POPPIES_CONFIG_SLUG,poppiesDefaults,validatePoppiesConfig} from "@/lib/poppiesConfig";
export async function getPoppiesSettings(){const {data,error}=await createSupabaseServiceClient().from("news_posts").select("content").eq("slug",POPPIES_CONFIG_SLUG).maybeSingle();if(error)throw new Error(error.message);return data?validatePoppiesConfig(JSON.parse(data.content)):poppiesDefaults;}
