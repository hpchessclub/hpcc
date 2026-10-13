import {NextResponse} from 'next/server';
import {getCurrentAdmin} from '@/lib/auth';
import {canAccess} from '@/lib/roles';
import {createSupabaseServiceClient} from '@/lib/supabase/service';
export async function PATCH(req:Request){
 const admin=await getCurrentAdmin();if(!admin||!canAccess(admin.profile.role,'dashboard'))return NextResponse.json({error:'Please sign in again.'},{status:401});
 try{const p=await req.json();if(Object.keys(p).some(k=>!['first_name','last_name','phone'].includes(k)))throw new Error('Email and role cannot be changed here.');for(const key of ['first_name','last_name','phone'])if(typeof p[key]!=='string'||p[key].length>200)throw new Error('Invalid profile details.');if(!p.first_name.trim())throw new Error('First name is required.');
 const {data,error}=await createSupabaseServiceClient().from('profiles').update({first_name:p.first_name.trim(),last_name:p.last_name.trim(),full_name:[p.first_name.trim(),p.last_name.trim()].filter(Boolean).join(' '),phone:p.phone.trim(),updated_at:new Date().toISOString()}).eq('id',admin.user.id).select('id').single();if(error||!data)throw new Error('Profile could not be saved.');return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save profile.'},{status:400});}
}
