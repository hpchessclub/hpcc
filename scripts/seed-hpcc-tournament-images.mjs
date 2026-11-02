// HPCC-only publication of the two tournament illustrations explicitly requested by the club.
import {createClient} from '@supabase/supabase-js';
import {isHpccProduction} from './seed-hpcc-nzcf-news.mjs';
export const images=[{slug:'booth-shield-2026',url:'/images/tournaments/booth-shield.webp'},{slug:'gentil-knight-blitz-2026',url:'/images/tournaments/gentil-knight-blitz.webp'}];
export function genericImage(value){return !value||/^\/images\/hpcc-(king|silver|modern).*\.(jpg|png|webp)$/.test(value);}
export async function publishTournamentImages(s){
 let updated=0;
 for(const image of images){
  const {data:row,error}=await s.from('tournaments').select('id,tournament_image_url').eq('slug',image.slug).single();if(error||!row)throw Error(`Cannot locate HPCC tournament ${image.slug}.`);
  if(row.tournament_image_url===image.url)continue;
  // Preserve later custom artwork uploaded by an administrator.
  if(!genericImage(row.tournament_image_url))continue;
  let q=s.from('tournaments').update({tournament_image_url:image.url}).eq('id',row.id);q=row.tournament_image_url?q.eq('tournament_image_url',row.tournament_image_url):row.tournament_image_url===null?q.is('tournament_image_url',null):q.eq('tournament_image_url','');
  const result=await q.select('id,tournament_image_url').single();if(result.error||result.data?.tournament_image_url!==image.url)throw Error(`HPCC tournament image changed concurrently: ${image.slug}.`);updated++;
 }
 return updated;
}
if(process.argv[1]?.endsWith('seed-hpcc-tournament-images.mjs')){
 if(!isHpccProduction(process.env))console.log('HPCC tournament illustration publication skipped outside matching production.');
 else{if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('HPCC server database configuration required.');const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});console.log(`HPCC tournament illustrations verified; ${await publishTournamentImages(s)} image records updated. Registrations, fees and payment history unchanged.`);}
}
