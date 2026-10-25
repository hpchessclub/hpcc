const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./payment-helpers.cjs');
const SELF='00000000-0000-4000-8000-000000000001';
const TARGET='00000000-0000-4000-8000-000000000002';
const user=(id=TARGET)=>({id,email:`${id}@example.invalid`,created_at:'2026-10-01'});
const profile=(id=TARGET)=>({...user(id),role:'admin',is_active:true});
function setup(options={}){
  const state={profiles:structuredClone(options.profiles||[]),auth:structuredClone(options.auth||[]),deleted:[],upserts:[],profileDeletes:[],pages:[],ranges:[]};
  const service={auth:{admin:{
    async listUsers({page,perPage}){state.pages.push(page);return {data:{users:state.auth.slice((page-1)*perPage,page*perPage)},error:options.listError};},
    async getUserById(id){if(options.lookupError)return {data:{user:null},error:options.lookupError};const found=state.auth.find(u=>u.id===id);return {data:{user:found||null},error:found?null:{status:404,message:'Not found'}};},
    async deleteUser(id){state.deleted.push(id);if(options.deleteError)return {error:options.deleteError};state.auth=state.auth.filter(u=>u.id!==id);return {error:null};}
  }},from(table){assert.equal(table,'profiles');let operation='select',id,payload,start=0,end=Infinity;
    const q={select(){return q},order(){return q},range(a,b){start=a;end=b;state.ranges.push(a);return q},eq(_,v){id=v;return q},delete(){operation='delete';return q},upsert(p){operation='upsert';payload=p;return q},single(){return q},maybeSingle(){return q},then(resolve,reject){
      if(operation==='upsert'){state.upserts.push(payload);if(options.profileError)return Promise.resolve({error:options.profileError,data:null}).then(resolve,reject);const old=state.profiles.find(p=>p.id===payload.id);if(old)Object.assign(old,payload);else state.profiles.push({...payload});return Promise.resolve({data:{...payload},error:null}).then(resolve,reject);}
      if(operation==='delete'){state.profileDeletes.push(id);if(options.profileError)return Promise.resolve({error:options.profileError}).then(resolve,reject);state.profiles=state.profiles.filter(p=>p.id!==id);return Promise.resolve({error:null}).then(resolve,reject);}
      return Promise.resolve({data:id?state.profiles.find(p=>p.id===id)||null:state.profiles.slice(start,end+1),error:options.profileReadError||null}).then(resolve,reject);
    }};return q;
  }};
  const api=load('app/api/admin/users/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>options.loggedOut?null:{user:user(SELF),profile:{...profile(SELF),role:options.role||'super_admin'}}},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service}});
  return {api,state};
}
const req=(method='DELETE',id=TARGET,origin='https://hpcc.example.invalid')=>new Request(`https://hpcc.example.invalid/api/admin/users?id=${id}`,{method,headers:{origin,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
test('list merges three profiles and six Auth accounts without hiding inactive or missing-profile accounts',async()=>{
  const auth=Array.from({length:6},(_,i)=>user(`account-${i}`));const {api}=setup({auth,profiles:auth.slice(0,3).map((u,i)=>({...u,role:'admin',is_active:i!==1}))});
  const res=await api.GET(),body=await res.json();assert.equal(res.status,200);assert.match(res.headers.get('Cache-Control'),/no-store/);assert.equal(body.users.length,6);assert.equal(new Set(body.users.map(u=>u.id)).size,6);assert.equal(body.current_user_id,SELF);assert.equal(body.users.find(u=>u.id==='account-1').is_active,false);assert.equal(body.users.find(u=>u.id==='account-5').has_profile,false);assert.equal(body.users.find(u=>u.id==='account-5').is_active,false);
});
test('list loads every profile and Auth page and excludes deleted Auth accounts',async()=>{
  const auth=Array.from({length:1001},(_,i)=>user(`account-${i}`));auth[1000].deleted_at='2026-10-02';const {api,state}=setup({auth,profiles:auth.slice(0,1000).map(u=>({...u,role:'admin'}))});const body=await (await api.GET()).json();assert.equal(body.users.length,1000);assert.deepEqual(state.pages,[1,2]);assert.deepEqual(state.ranges,[0,1000]);
});
test('list reports provider failure instead of claiming a partial list is complete',async()=>{const {api}=setup({listError:{message:'Auth unavailable'}});const res=await api.GET();assert.equal(res.status,400);assert.equal((await res.json()).users,undefined);});
test('only Super Admin can list, edit or remove accounts; cross-origin writes are rejected',async()=>{
  for(const options of [{role:'admin'},{loggedOut:true}]){const {api,state}=setup(options);assert.equal((await api.GET()).status,403);assert.equal((await api.DELETE(req())).status,403);assert.equal((await api.POST(req('POST'))).status,403);assert.deepEqual(state.deleted,[]);}
  const {api,state}=setup();for(const method of ['POST','DELETE'])assert.equal((await api[method](req(method,TARGET,'https://other.invalid'))).status,403);assert.deepEqual(state.deleted,[]);
});
test('self-deletion is blocked before any provider operation',async()=>{const {api,state}=setup({auth:[user(SELF)],profiles:[profile(SELF)]});assert.equal((await api.DELETE(req('DELETE',SELF))).status,400);assert.deepEqual(state.deleted,[]);assert.deepEqual(state.profileDeletes,[]);});
test('permitted deletion verifies both Auth and profile removal using disposable fixtures',async()=>{const {api,state}=setup({auth:[user()],profiles:[profile()]});const res=await api.DELETE(req());assert.equal(res.status,200);assert.equal((await res.json()).removed,true);assert.deepEqual(state.auth,[]);assert.deepEqual(state.profiles,[]);assert.deepEqual(state.deleted,[TARGET]);});
test('blocked Auth deletion revokes admin access and retains the Auth account and owned data',async()=>{const {api,state}=setup({auth:[user()],profiles:[profile()],deleteError:{message:'User owns storage objects'}});const res=await api.DELETE(req()),body=await res.json();assert.equal(res.status,200);assert.equal(body.removed,false);assert.match(body.message,/Auth account was retained/);assert.equal(state.auth.length,1);assert.equal(state.profiles[0].is_active,false);assert.equal(state.profiles[0].role,'member');assert.deepEqual(state.profileDeletes,[]);});
test('failed access revocation or cleanup is never reported as successful deletion',async()=>{for(const deleteError of [undefined,{message:'Owns files'}]){const {api}=setup({auth:[user()],profiles:[profile()],deleteError,profileError:{message:'Database unavailable'}});const res=await api.DELETE(req());assert.equal(res.status,400);assert.equal((await res.json()).ok,undefined);}});
test('stale profile can be removed without deleting any Auth account; lookup outages preserve everything',async()=>{const {api,state}=setup({profiles:[profile()]});assert.equal((await api.DELETE(req())).status,200);assert.deepEqual(state.deleted,[]);assert.deepEqual(state.profiles,[]);const broken=setup({auth:[user()],profiles:[profile()],lookupError:{status:503,message:'Unavailable'}});assert.equal((await broken.api.DELETE(req())).status,400);assert.deepEqual(broken.state.deleted,[]);assert.equal(broken.state.profiles.length,1);});
