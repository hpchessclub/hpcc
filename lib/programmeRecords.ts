import "server-only";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
// Use HPCC's existing unpublished content storage. Each year has a distinct,
// stable slug; no schema migration or destructive conversion is needed.
export async function saveProgrammeRecords(slug:string,title:string,config:{events?:{year:number}[]}){
 const stamp=new Date().toISOString();
 const records=[{slug,title,content:JSON.stringify(config)},...(config.events??[]).map(event=>({slug:`${slug}-year-${event.year}`,title:`${title} — ${event.year}`,content:JSON.stringify(event)}))].map(row=>({...row,is_published:false,publish_to_social:false,updated_at:stamp}));
 const {data,error}=await createSupabaseServiceClient().from("news_posts").upsert(records,{onConflict:"slug"}).select("slug,content");
 if(error)throw new Error(error.message);
 if(!data||records.some(row=>!data.some(saved=>saved.slug===row.slug&&saved.content===row.content)))throw new Error("Saved yearly records could not be verified. Please reload before retrying.");
}
export async function loadProgrammeRecords(slug:string){
 const {data,error}=await createSupabaseServiceClient().from("news_posts").select("slug,content").like("slug",`${slug}-year-%`).order("slug").limit(101);
 if(error)throw new Error(error.message);
 return (data??[]).map(row=>JSON.parse(row.content));
}
