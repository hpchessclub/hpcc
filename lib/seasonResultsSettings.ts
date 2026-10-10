import "server-only";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {SEASON_RESULTS_SLUG,seasonResultsDefaults,validateSeasonResults} from "@/lib/seasonResultsConfig";
export async function getSeasonResultsSettings(){
 const {data,error}=await createSupabaseServiceClient().from("news_posts").select("content").eq("slug",SEASON_RESULTS_SLUG).maybeSingle();
 if(error)throw new Error(error.message);
 return data?validateSeasonResults(JSON.parse(data.content)):seasonResultsDefaults;
}
