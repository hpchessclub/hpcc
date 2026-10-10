import "server-only";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {POPPIES_CONFIG_SLUG,poppiesDefaults,validatePoppiesConfig} from "@/lib/poppiesConfig";
export async function getPoppiesSettings(){const {data,error}=await createSupabaseServiceClient().from("news_posts").select("content").eq("slug",POPPIES_CONFIG_SLUG).maybeSingle();if(error)throw new Error(error.message);if(!data)return poppiesDefaults;const config=validatePoppiesConfig(JSON.parse(data.content));return {...config,events:config.events.map(event=>event.year===2026&&!event.results&&!event.resultsUrl?{...event,results:poppiesDefaults.events[0].results,resultsUrl:poppiesDefaults.events[0].resultsUrl}:event)};}
