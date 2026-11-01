import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const actor='11111111-1111-4111-a111-111111111111',entry='22222222-2222-4222-a222-222222222222';
async function fixture(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
create table profiles(id uuid primary key,role text,is_active boolean);
create table tournament_registrations(id uuid primary key,email text,entry_fee_cents int,payment_status text,registration_status text,stripe_checkout_session_id text,stripe_payment_intent_id text,updated_at timestamptz);
create table payment_records(id uuid default gen_random_uuid(),payment_type text,reference_id uuid,email text,amount_cents int,status text);
`);const sql=fs.readFileSync('supabase/migration_v4_10_withdrawals_refunds.sql','utf8');await db.exec(sql);await db.exec(sql);
await db.query(`insert into profiles values($1,'admin',true)`,[actor]);await db.query(`insert into tournament_registrations(id,email,entry_fee_cents,payment_status,registration_status) values($1,'fixture@example.invalid',2000,'paid','confirmed')`,[entry]);
await db.query(`insert into payment_records(payment_type,reference_id,email,amount_cents,status) values('tournament',$1,'fixture@example.invalid',2000,'paid')`,[entry]);return db;}
async function withdraw(db){return (await db.query(`select hpcc_withdraw_tournament($1,$2,'Player requested withdrawal',true,null) as w`,[entry,actor])).rows[0].w;}
test('repeatable migration; atomic withdrawal retains history, policy and blocks resurrection/deletion',async()=>{
const db=await fixture();try{await db.query(`insert into audit_logs(action,entity_type,entity_id,summary)values('registration_policy_accepted','tournament',$1,'{"policy":"Fixture accepted policy"}')`,[entry]);
const w=await withdraw(db);assert.equal(w.registration_snapshot.accepted_policy_snapshot.policy,'Fixture accepted policy');assert.equal(w.registration_snapshot.registration_status,'confirmed');
assert.equal((await withdraw(db)).id,w.id);assert.equal((await db.query('select * from hpcc_tournament_withdrawals')).rows.length,1);
await db.exec(`update tournament_registrations set registration_status='confirmed'`);assert.equal((await db.query('select * from tournament_registrations')).rows[0].registration_status,'cancelled');assert.equal((await db.query('select * from payment_records')).rows.length,1);
await assert.rejects(db.query('delete from tournament_registrations where id=$1',[entry]));
assert.equal((await db.query("select * from audit_logs where action='tournament_withdrawn'")).rows.length,1);
}finally{await db.close();}});
test('manual refund requires paid receipt, reference, actor; preserves original receipt and is idempotent by rejecting repeats',async()=>{
const db=await fixture();try{const w=await withdraw(db);
await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'manual','Reviewed refund',2000,'bank_transfer','')`,[w.id,actor]));
await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'manual','Reviewed refund',2001,'bank_transfer','TX123')`,[w.id,actor]));
await db.query(`select hpcc_review_withdrawal($1,$2,'manual','Reviewed refund',2000,'bank_transfer','TX123')`,[w.id,actor]);
await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'manual','Again',2000,'bank_transfer','TX123')`,[w.id,actor]));
assert.equal((await db.query('select * from tournament_registrations')).rows[0].payment_status,'refunded');assert.equal((await db.query('select * from payment_records')).rows[0].amount_cents,2000);assert.equal((await db.query('select * from payment_records')).rows.length,1);
await db.exec(`update profiles set role='content_manager'`);await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'decline','Not allowed')`,[w.id,actor]));
}finally{await db.close();}});
test('partial manual refund, declined refund and invalid/stale requests cannot re-confirm entries',async()=>{
const db=await fixture();try{
await assert.rejects(db.query(`select hpcc_withdraw_tournament($1,$2,'Reason',true,now())`,[entry,actor]));
const w=await withdraw(db);await db.query(`select hpcc_review_withdrawal($1,$2,'manual','Partial policy refund',500,'cash','Receipt 123')`,[w.id,actor]);
assert.equal((await db.query('select * from tournament_registrations')).rows[0].payment_status,'paid');assert.equal((await db.query('select * from hpcc_tournament_withdrawals')).rows[0].amount_cents,500);
}finally{await db.close();}});
test('Stripe claim is durable, repeat amounts must match, successful finalization is audited once',async()=>{
const db=await fixture();try{const w=await withdraw(db);for(let i=0;i<2;i++)await db.query(`select hpcc_review_withdrawal($1,$2,'stripe','Approved under policy',1500,null,null)`,[w.id,actor]);
await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'stripe','Changed amount',2000,null,null)`,[w.id,actor]));
await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'decline','Cannot decline processing')`,[w.id,actor]));
for(let i=0;i<2;i++)await db.query(`select hpcc_finish_stripe_refund($1,'re_fixture','succeeded',null)`,[w.id]);
assert.equal((await db.query("select * from audit_logs where action='stripe_refund_verified'")).rows.length,1);
assert.equal((await db.query('select * from hpcc_tournament_withdrawals')).rows[0].status,'refunded');
}finally{await db.close();}});

test('declining a refund keeps the player withdrawn; public roles cannot read private history or execute approvals',async()=>{
const db=await fixture();try{const w=await withdraw(db);await db.query(`select hpcc_review_withdrawal($1,$2,'decline','Outside accepted refund policy')`,[w.id,actor]);
assert.equal((await db.query('select * from hpcc_tournament_withdrawals')).rows[0].status,'declined');assert.equal((await db.query('select * from tournament_registrations')).rows[0].registration_status,'cancelled');assert.equal((await db.query('select * from payment_records')).rows[0].status,'paid');
await db.exec('set role anon');await assert.rejects(db.query('select * from hpcc_tournament_withdrawals'));await assert.rejects(db.query(`select hpcc_review_withdrawal($1,$2,'stripe','Not permitted',2000,null,null)`,[w.id,actor]));await db.exec('reset role');
}finally{await db.close();}});
