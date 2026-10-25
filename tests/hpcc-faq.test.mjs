import test from 'node:test';
import assert from 'node:assert/strict';
import {seedFaq,faqId,normalizeQuestion} from '../scripts/seed-hpcc-faq.mjs';
test('FAQ import preserves existing edited/unpublished records and is repeatable',async()=>{
 const rows=[{id:'old',question:'Does MY annual fee include NZCF Membership?',answer:'Edited answer',is_published:false,display_order:10}];
 const client={from(table){assert.equal(table,'faqs');return {select:async()=>({data:rows,error:null}),upsert:async(items)=>{for(const row of items)if(!rows.some(r=>r.id===row.id))rows.push(row);return {error:null};}};}};
 const items=[{question:'Does my annual fee include NZCF membership?',answer:'Source answer'},{question:'New question?',answer:'New answer'}];
 assert.equal(await seedFaq(client,items),1);assert.equal(await seedFaq(client,items),0);
 assert.equal(rows[0].answer,'Edited answer');assert.equal(rows[0].is_published,false);assert.equal(rows[1].display_order,11);assert.equal(rows[1].is_published,true);
 assert.equal(faqId('New question?'),faqId('NEW QUESTION'));assert.equal(normalizeQuestion(' F.A.Q? '),'faq');
});
test('FAQ import fails before writes if existing records cannot be inspected',async()=>{
 await assert.rejects(seedFaq({from:()=>({select:async()=>({error:{message:'denied'}})})},[]),/Cannot inspect/);
});
