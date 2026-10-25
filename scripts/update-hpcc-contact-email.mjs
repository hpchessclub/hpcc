// One-time, repeatable update explicitly requested by HPCC. No emails are sent.
import {createClient} from '@supabase/supabase-js';
import {isHpccProduction} from './seed-hpcc-nzcf-news.mjs';
const email='howickpakurangachessclub@gmail.com';
if(isHpccProduction(process.env)){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('HPCC server configuration required.');
 const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 // Change only the retired general address; preserve later administrator changes.
 const {error}=await s.from('club_settings').update({general_email:email}).eq('general_email','hpchess.winnie@gmail.com');
 if(error)throw new Error(`HPCC contact email update failed: ${error.message}`);
 const {data,error:readError}=await s.from('club_settings').select('general_email');
 if(readError||!data?.length||data.some(row=>row.general_email==='hpchess.winnie@gmail.com'))throw new Error('HPCC contact email update could not be verified.');
 console.log('HPCC general contact email verified. Personal committee contacts and SMTP authentication unchanged.');
}else console.log('HPCC contact email update skipped outside matching production.');
