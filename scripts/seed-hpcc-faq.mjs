// Add only the requested HPCC FAQ records; preserve all existing answers and publication settings.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {isHpccProduction} from './seed-hpcc-nzcf-news.mjs';
export const normalizeQuestion = value => value.toLowerCase().replace(/[^a-z0-9]/g,'');
export function faqId(question){const h=createHash('sha256').update(`hpcc-faq:${normalizeQuestion(question)}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
export async function seedFaq(client,items){
 const {data:existing,error}=await client.from('faqs').select('id,question,display_order');
 if(error)throw new Error(`Cannot inspect existing HPCC FAQs: ${error.message}`);
 const questions=new Set(existing.map(row=>normalizeQuestion(row.question)));
 let order=Math.max(0,...existing.map(row=>Number(row.display_order)||0));
 const missing=items.filter(item=>!questions.has(normalizeQuestion(item.question))).map(item=>({...item,id:faqId(item.question),display_order:++order,is_published:true}));
 if(missing.length){const {error:writeError}=await client.from('faqs').upsert(missing,{onConflict:'id',ignoreDuplicates:true});if(writeError)throw new Error(`Cannot add HPCC FAQs: ${writeError.message}`);}
 const {data:verified,error:verifyError}=await client.from('faqs').select('question');
 const found=new Set((verified||[]).map(row=>normalizeQuestion(row.question)));
 if(verifyError||items.some(item=>!found.has(normalizeQuestion(item.question))))throw new Error('HPCC FAQ publication could not be verified.');
 return missing.length;
}
if(process.argv[1]?.endsWith('seed-hpcc-faq.mjs')){
 if(!isHpccProduction(process.env))console.log('HPCC FAQ import skipped outside matching HPCC production.');
 else{
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('HPCC server database configuration is required for FAQ import.');
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const items=JSON.parse(await readFile(new URL('../content/hpcc-faq.json',import.meta.url),'utf8'));
  console.log(`HPCC FAQ import verified; ${await seedFaq(client,items)} missing records added. Existing records preserved.`);
 }
}
