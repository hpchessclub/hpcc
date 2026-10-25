import {loadProgrammeRecords} from "@/lib/programmeRecords";
import "server-only";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {POPPIES_CONFIG_SLUG,poppiesDefaults,validatePoppiesConfig} from "@/lib/poppiesConfig";
export async function getPoppiesSettings(){const {data,error}=await createSupabaseServiceClient().from("news_posts").select("content").eq("slug",POPPIES_CONFIG_SLUG).maybeSingle();if(error)throw new Error(error.message);if(!data)return poppiesDefaults;const saved=JSON.parse(data.content);const years=await loadProgrammeRecords(POPPIES_CONFIG_SLUG);const config=validatePoppiesConfig(years.length?{...saved,events:years}:saved);return {...config,events:config.events.map(event=>event.year===2026&&!event.results&&!event.resultsUrl?{...event,results:poppiesDefaults.events[0].results,resultsUrl:poppiesDefaults.events[0].resultsUrl}:event)};}
