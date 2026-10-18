const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./payment-helpers.cjs');
const SELF='admin-self';const valid={currentPassword:'old-password',newPassword:'new-password-1234',confirmPassword:'new-password-1234'};
const request=(body=valid,origin='https://hpcc.example.invalid')=>new Request('https://hpcc.example.invalid/api/admin/change-password',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
function setup(options={}){
 const state={checks:[],updates:[],signouts:[],cleared:0};const verifier={auth:{async signInWithPassword(input){state.checks.push(input);if(options.throwSignIn)throw Error('Network failure');return {data:{user:options.wrongUser?{id:'different'}:{id:SELF}},error:options.signInError||null};},async updateUser(input){state.updates.push(input);return {data:{user:options.noUpdatedUser?null:{id:SELF}},error:options.updateError||null};},async signOut(){state.signouts.push('isolated');return {error:null};}}};
 const api=load('app/api/admin/change-password/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>options.loggedOut?null:{user:{id:SELF,email:'signed-in@example.invalid'},profile:{role:options.role||'admin'}}},'@supabase/supabase-js':{createClient:(_url,_key,config)=>{assert.equal(config.auth.persistSession,false);assert.equal(config.auth.autoRefreshToken,false);return verifier;}},'@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{signOut:async()=>{state.signouts.push('existing');return {error:null};}}})},'@/lib/adminSession':{clearAdminActivity:async()=>{state.cleared++;}}});return {api,state};
}
test('every admin/staff role verifies the current password, changes only self, and requires a fresh login',async()=>{
 for(const role of ['super_admin','admin','news_editor','tournament_manager','gallery_manager','faq_manager','coaching_manager','social_media_manager','communications_manager']){const {api,state}=setup({role});const res=await api.POST(request({...valid,id:'other-user',email:'other@example.invalid'}));assert.equal(res.status,200);assert.equal((await res.json()).ok,true);assert.equal(state.checks[0].email,'signed-in@example.invalid');assert.equal(state.checks[0].password,valid.currentPassword);assert.equal(state.updates.length,1);assert.equal(state.updates[0].password,valid.newPassword);assert.equal(state.updates[0].current_password,valid.currentPassword);assert.deepEqual(state.signouts,['existing','isolated']);assert.equal(state.cleared,1);}
});
test('incorrect password, identity mismatch, provider policy errors and network failures never claim success',async()=>{
 for(const options of [{signInError:{code:'invalid_credentials'}},{wrongUser:true},{throwSignIn:true},{updateError:{code:'weak_password',message:'Password rejected'}},{noUpdatedUser:true}]){const {api,state}=setup(options);const res=await api.POST(request());assert.ok(res.status>=400);assert.equal((await res.json()).ok,undefined);assert.equal(state.cleared,0);assert.deepEqual(state.signouts,['isolated']);if(options.signInError||options.wrongUser||options.throwSignIn)assert.deepEqual(state.updates,[]);}
});
test('expired sessions, members, invalid origins and invalid password fields cannot reach password verification',async()=>{
 for(const options of [{loggedOut:true},{role:'member'}]){const {api,state}=setup(options);assert.ok((await api.POST(request())).status>=400);assert.deepEqual(state.checks,[]);}
 for(const body of [{...valid,currentPassword:''},{...valid,confirmPassword:'mismatch'},{...valid,newPassword:'short',confirmPassword:'short'},{...valid,newPassword:valid.currentPassword,confirmPassword:valid.currentPassword},null]){const {api,state}=setup();assert.equal((await api.POST(request(body))).status,400);assert.deepEqual(state.checks,[]);}
 const {api,state}=setup();assert.equal((await api.POST(request(valid,'https://other.invalid'))).status,403);assert.deepEqual(state.checks,[]);
});

test('real Supabase SDK password flow rejects a wrong password and the old password stops working after a successful change (isolated Auth fixture)',async()=>{
 const {createClient}=require('@supabase/supabase-js');let storedPassword='old-password',putCount=0,cleared=0;const requests=[];
 const fixtureUser={id:SELF,email:'signed-in@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-10-01T00:00:00Z',app_metadata:{},user_metadata:{}};
 const accessToken=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:SELF,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
 const fetchFixture=async(url,init={})=>{
   const path=new URL(String(url));requests.push(`${init.method} ${path.pathname}`);
   if(path.pathname==='/auth/v1/token'){
     const input=JSON.parse(init.body);if(input.email!==fixtureUser.email||input.password!==storedPassword)return Response.json({code:'invalid_credentials',msg:'Invalid login credentials'},{status:400,headers:{'X-Supabase-Api-Version':'2024-01-01'}});
     return Response.json({access_token:accessToken,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:fixtureUser});
   }
   if(path.pathname==='/auth/v1/user'&&init.method==='PUT'){
     putCount++;assert.equal(init.headers.Authorization,`Bearer ${accessToken}`);const input=JSON.parse(init.body);storedPassword=input.password;return Response.json(fixtureUser);
   }
   if(path.pathname==='/auth/v1/logout')return new Response(null,{status:204});
   throw Error(`Unexpected Auth call: ${path.pathname}`);
 };
 const sdkClient=()=>createClient('https://isolated-auth.invalid','test-publishable-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fetchFixture}});
 const api=load('app/api/admin/change-password/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({user:fixtureUser,profile:{role:'admin'}})},'@supabase/supabase-js':{createClient:sdkClient},'@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{signOut:async()=>({error:null})}})},'@/lib/adminSession':{clearAdminActivity:async()=>{cleared++;}}});
 const wrong=await api.POST(request({...valid,currentPassword:'wrong-password'}));assert.equal(wrong.status,400);assert.equal(putCount,0);assert.equal(storedPassword,'old-password');
 const changed=await api.POST(request());assert.equal(changed.status,200);assert.equal(putCount,1);assert.equal(cleared,1);
 const client=sdkClient();assert.equal((await client.auth.signInWithPassword({email:fixtureUser.email,password:'old-password'})).error.code,'invalid_credentials');assert.equal((await client.auth.signInWithPassword({email:fixtureUser.email,password:valid.newPassword})).data.user.id,SELF);await client.auth.signOut({scope:'local'});assert(requests.includes('PUT /auth/v1/user'));
});
