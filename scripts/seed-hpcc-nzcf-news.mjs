// Narrowly scoped, repeatable publication of the two NZCF links requested by HPCC.
// Local builds and Preview deployments never contact a database.
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
export function isHpccProduction(env){return env.VERCEL_ENV==='production'&&env.VERCEL_GIT_REPO_OWNER==='hpchessclub'&&env.VERCEL_GIT_REPO_SLUG==='hpcc'&&env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'')==='https://nrnlbgwgfknwpwpuhwri.supabase.co';}
export async function seedNews(client,items){
 const rows=items.map(item=>({...item,is_published:true,publish_to_social:false}));
 const {error}=await client.from('news_posts').upsert(rows,{onConflict:'slug',ignoreDuplicates:true});
 if(error)throw new Error(`HPCC news publication failed: ${error.message}`);
 const {data,error:readError}=await client.from('news_posts').select('slug').in('slug',items.map(item=>item.slug));
 if(readError||data?.length!==items.length)throw new Error('HPCC news publication could not be verified.');
 return data.length;
}
if(process.argv[1]?.endsWith('seed-hpcc-nzcf-news.mjs')){
 if(!isHpccProduction(process.env)){console.log('HPCC news publication skipped outside the matching HPCC production deployment.');}
 else{
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('HPCC server database configuration is required to publish the requested news.');
  const items=JSON.parse(await readFile(new URL('../content/nzcf-news-october-2026.json',import.meta.url),'utf8'));
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  console.log(`Verified ${await seedNews(client,items)} requested HPCC news records. Existing records were preserved; no social posts or emails were sent.`);
 }
}
