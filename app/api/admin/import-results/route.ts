import {NextResponse} from "next/server";
import {revalidatePath} from "next/cache";
import {getCurrentAdmin} from "@/lib/auth";
import {canAccess} from "@/lib/roles";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {HPCC_RESULTS_SOURCE,parseTournamentResults} from "@/lib/importTournamentResults";
import {slugify} from "@/lib/format";
export async function POST(req:Request){
 const admin=await getCurrentAdmin();if(!admin)return NextResponse.json({error:'Not authorised'},{status:401});
 if(!canAccess(admin.profile.role,'results'))return NextResponse.json({error:'Permission denied'},{status:403});
 try{
  const body=await req.json();if(!['preview','import'].includes(body.action))throw new Error('Select preview or import.');
  const response=await fetch(HPCC_RESULTS_SOURCE,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('HPCC source results page is unavailable.');
  const html=await response.text();if(html.length>1000000)throw new Error('Source page is too large.');const results=parseTournamentResults(html);
  if(body.action==='preview')return NextResponse.json({results});
  if(JSON.stringify(body.results)!==JSON.stringify(results))throw new Error('The source results changed. Preview them again before importing.');
  const s=createSupabaseServiceClient();const {data:existing,error}=await s.from('tournaments').select('*');if(error)throw new Error(error.message);
  const plans=results.map(r=>{
   const slug=`${slugify(r.title)}-${r.year}`;
   const matches=(existing||[]).filter(t=>t.slug===slug||(String(t.title).trim().toLowerCase()===r.title.toLowerCase()&&Number(t.tournament_year||(t.start_date?String(t.start_date).slice(0,4):0))===r.year));
   if(matches.length>1)throw new Error(`Multiple records match ${r.title}. Review them in Tournaments first.`);
   const summary=`Winner(s): ${r.winner}\nScore: ${r.score}`;const current=matches[0];
   if(current&&((current.first_place_name&&current.first_place_name!==r.winner)||(current.result_summary&&current.result_summary!==summary)||(current.vega_url&&current.vega_url!==r.url)))throw new Error(`${r.title} already has different result information. Review it in Tournaments; no existing results will be overwritten.`);
   return {r,slug,current,summary};
  });
  let saved=0;
  for(const {r,slug,current,summary} of plans){
   const fields={first_place_name:r.winner,result_summary:summary,...(r.url?{vega_url:r.url}:{}),updated_at:new Date().toISOString()};
   const query=current?s.from('tournaments').update(fields).eq('id',current.id):s.from('tournaments').upsert({...fields,title:r.title,slug,tournament_year:r.year,tournament_type:'club_calendar',status:'completed',show_in_calendar:false,allow_public_registration:false,require_payment:false,publish_to_social:false,created_by:admin.user.id},{onConflict:'slug',ignoreDuplicates:true});
   const {error:saveError}=await query;if(saveError)throw new Error(`Saved ${saved} results before ${r.title} failed: ${saveError.message}. You can safely retry.`);
   const {data:record,error:verifyError}=await s.from('tournaments').select('id,first_place_name,result_summary,vega_url').eq(current?'id':'slug',current?current.id:slug).single();
   if(verifyError||!record||record.first_place_name!==r.winner||record.result_summary!==summary||(r.url&&record.vega_url!==r.url))throw new Error(`Could not verify ${r.title}. Review the saved record before retrying.`);
   saved++;
  }
  revalidatePath('/results');revalidatePath('/club-admin/results');revalidatePath('/club-admin/tournaments');
  return NextResponse.json({ok:true,count:saved});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to import results.'},{status:400});}
}
