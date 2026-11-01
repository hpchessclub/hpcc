const test=require('node:test'),assert=require('node:assert/strict');
const {load,FakeDB}=require('./payment-helpers.cjs');
const id='11111111-1111-4111-a111-111111111111',tid='22222222-2222-4222-a222-222222222222';
function fixture(){
 const entry={id,tournament_id:tid,entry_fee_cents:2000,stripe_checkout_session_id:'cs_live_fixture',stripe_payment_intent_id:'pi_fixture',registration_status:'cancelled',payment_status:'paid'};
 const session={id:'cs_live_fixture',mode:'payment',status:'complete',payment_status:'paid',amount_total:2000,currency:'nzd',livemode:true,payment_intent:'pi_fixture',metadata:{type:'tournament_registration',registration_id:id,tournament_id:tid}};
 const request={id:tid,status:'pending',refund_due_cents:2000};let creates=0,expired=0;const records=[];
 const db=new FakeDB(entry);db.rpc=async(name,args)=>{records.push({name,args});return {data:{...request,status:'completed'},error:null};};
 const charge={id:'ch_fixture',paid:true,status:'succeeded',currency:'nzd',amount:2000,amount_refunded:2000,refunded:true,payment_intent:'pi_fixture'};
 const refund={id:'re_fixture',amount:2000,currency:'nzd',payment_intent:'pi_fixture',charge:'ch_fixture',status:'succeeded'};
 const stripe={checkout:{sessions:{retrieve:async()=>session,expire:async()=>{expired++;return {...session,status:'expired'};}}},charges:{list:async()=>({data:[charge],has_more:false})},refunds:{list:async()=>({data:[refund],has_more:false}),create:async()=>{creates++;throw Error('Refund creation forbidden');}}};
 const helpers=load('lib/withdrawals.ts',{'@/lib/stripe':{getStripe:()=>stripe},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})}});
 return {entry,session,request,db,stripe,charge,refund,helpers,records,get created(){return creates;},get expired(){return expired;}};
}
test('Stripe verification checks identity, amount, NZD and live mode; never issues refunds',async()=>{
 const f=fixture();const result=await f.helpers.verifyFullStripeRefund(f.db,f.entry,f.request,id,'Full refund checked',true);assert.equal(result.status,'completed');assert.equal(f.records[0].name,'hpcc_complete_refund_v2');assert.equal(f.records[0].args.p_reference,'re_fixture');assert.equal(f.created,0);
 await f.helpers.verifyFullStripeRefund(f.db,f.entry,result,id,'Repeat',true);assert.equal(f.records.length,1);
 for(const change of [{amount_total:1999},{currency:'usd'},{livemode:false},{metadata:{...f.session.metadata,registration_id:tid}}])assert.throws(()=>f.helpers.validateRefundSession({...f.session,...change},f.entry));
});
test('partial, pending, failed, mismatched or incomplete refund evidence never completes the full workflow',async()=>{
 for(const change of [{amount:1000},{status:'pending'},{status:'failed'},{currency:'usd'},{charge:'ch_other'},{payment_intent:'pi_other'}]){const f=fixture();Object.assign(f.refund,change);await assert.rejects(f.helpers.verifyFullStripeRefund(f.db,f.entry,f.request,id,'Check refund',true));assert.equal(f.records.length,0);assert.equal(f.created,0);}
 const f=fixture();f.charge.refunded=false;await assert.rejects(f.helpers.verifyFullStripeRefund(f.db,f.entry,f.request,id,'Review',true));assert.equal(f.records.length,0);
});
test('full refund acknowledgement is required and paginated/ambiguous evidence fails closed',async()=>{
 const f=fixture();await assert.rejects(f.helpers.verifyFullStripeRefund(f.db,f.entry,f.request,id,'Check',false));f.stripe.refunds.list=async()=>({data:[f.refund],has_more:true});await assert.rejects(f.helpers.verifyFullStripeRefund(f.db,f.entry,f.request,id,'Check',true),/manual/);assert.equal(f.records.length,0);
});
test('withdrawal expires an unpaid open checkout and blocks an unverified completed payment',async()=>{
 const f=fixture();f.session.status='open';await f.helpers.prepareWithdrawal(f.entry);assert.equal(f.expired,1);f.session.status='complete';f.entry.payment_status='pending_payment';await assert.rejects(f.helpers.prepareWithdrawal(f.entry),/verify payment/);
});
test('withdrawal API rejects anonymous users and non-payment admin roles before accessing database',async()=>{for(const admin of [null,{profile:{role:'content_manager'}},{profile:{role:'tournament_manager'}}]){let calls=0;const route=load('app/api/admin/withdrawals/route.ts',{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'next/cache':{revalidatePath(){}},'@/lib/auth':{getCurrentAdmin:async()=>admin},'@/lib/supabase/service':{createSupabaseServiceClient(){calls++;throw Error('Must not query');}},'@/lib/withdrawals':{}});const res=await route.POST({json:async()=>({})});assert.equal(res.status,403);assert.equal(calls,0);assert.equal((await route.GET({})).status,403);}});
test('late Stripe checkout after withdrawal records payment without re-confirming or emailing',async()=>{const f=fixture();f.entry.payment_status='pending_payment';const db=new FakeDB(f.entry);let sent=0;const pay=load('lib/tournamentPayment.ts',{'@/lib/tournamentRefund':{checkTournamentRefund:async()=>null},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})},'@/lib/email':{sendEmail:async()=>{sent++;}}});const result=await pay.confirmTournamentPayment(db,f.session);assert.equal(result.status,'withdrawn');assert.equal(db.tables.tournament_registrations[0].registration_status,'cancelled');assert.equal(db.tables.payment_records.length,1);assert.equal(sent,0);});
test('service worker never caches private, API or prefetched tournament player data',()=>{
 const vm=require('node:vm'),fs=require('node:fs');const listeners={};vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{location:{origin:'https://hpcc.example.test'},addEventListener:(n,fn)=>listeners[n]=fn},URL});
 for(const path of ['/api/private','/club-admin/tournament-registrations','/payment/success','/tournaments/test/entries?_rsc=abc','/tournaments/test/entries']){let responded=false;listeners.fetch({request:{method:'GET',url:`https://hpcc.example.test${path}`,mode:'cors',headers:{get:()=>null}},respondWith(){responded=true;}});assert.equal(responded,false,path);}
});
test('withdrawal API rejects cross-origin and non-JSON requests before any database access',async()=>{
 let dbCalls=0;const route=load('app/api/admin/withdrawals/route.ts',{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'next/cache':{revalidatePath(){}},'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'admin'},user:{id}})},'@/lib/supabase/service':{createSupabaseServiceClient(){dbCalls++;}},'@/lib/withdrawals':{}});
 for(const headers of [new Headers({'content-type':'text/plain'}),new Headers({'content-type':'application/json',origin:'https://other.example.test'})]){const res=await route.POST({url:'https://hpcc.example.test/api/admin/withdrawals',headers,json:async()=>({})});assert.equal(res.status,400);}
 assert.equal(dbCalls,0);
});
test('refund webhook checks event live mode (Refund objects have no livemode field)',async()=>{
 let called=0;const event={id:'evt_fixture',type:'refund.updated',livemode:true,data:{object:{id:'re_fixture',metadata:{hpcc_withdrawal_id:tid}}}};
 const previous=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';try{
 const route=load('app/api/stripe/webhook/route.ts',{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'@/lib/withdrawals':{syncWithdrawalRefundEvent:async()=>{called++;}},'@/lib/tournamentRefund':{},'@/lib/membershipRenewal':{},'@/lib/membershipPayment':{},'@/lib/tournamentPayment':{},'@/lib/supabase/service':{createSupabaseServiceClient:()=>({})},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true})},'@/lib/stripe':{getStripe:()=>({webhooks:{constructEvent:()=>event}})}});
 const req={headers:{get:()=> 'signature-fixture'},text:async()=>''};assert.equal((await route.POST(req)).status,200);assert.equal(called,1);event.livemode=false;assert.equal((await route.POST(req)).status,503);assert.equal(called,1);
 }finally{if(previous===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=previous;}
});
test('policy dialog prefers the accepted withdrawal snapshot and never serializes private snapshot records',async()=>{
 const f=fixture();f.entry.tournaments={registration_policy:'New event policy'};const db=new FakeDB(f.entry);db.tables.hpcc_tournament_withdrawals=[{id:tid,registration_id:id,status:'pending',refund_due_cents:2000,reason:'Fixture reason',registration_snapshot:{email:'private@example.invalid',phone:'private phone',accepted_policy_snapshot:{policy:'Accepted original policy'}}}];
 const route=load('app/api/admin/withdrawals/route.ts',{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'next/cache':{revalidatePath(){}},'@/lib/auth':{getCurrentAdmin:async()=>({user:{id},profile:{role:'admin'}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
 const result=await route.GET({url:`https://hpcc.example.test/api/admin/withdrawals?id=${id}`});assert.equal(result.status,200);assert.equal(result.body.policy,'Accepted original policy');assert.equal(result.body.policy_source,'Accepted at registration');assert(!JSON.stringify(result.body).includes('private@example.invalid'));assert(!JSON.stringify(result.body).includes('private phone'));assert(!('registration_snapshot' in result.body.withdrawal));
});
