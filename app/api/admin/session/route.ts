import {NextResponse} from 'next/server';
import {getCurrentAdmin} from '@/lib/auth';
import {canAccess} from '@/lib/roles';
import {writeAdminActivity} from '@/lib/adminSession';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const body=await req.json();const login=body.action==='login';
 if(!login&&body.action!=='activity')return NextResponse.json({error:'Invalid action'},{status:400});
 const admin=await getCurrentAdmin({establishSession:login});if(!admin||!canAccess(admin.profile.role,'dashboard'))return NextResponse.json({error:'Please sign in again.'},{status:401});
 // Only a genuinely fresh Supabase login may establish a new idle session.
 if(login && (!admin.user.last_sign_in_at || Date.now()-Date.parse(admin.user.last_sign_in_at)>60000))return NextResponse.json({error:'Please sign in again.'},{status:401});
 await writeAdminActivity(admin.user.id);return NextResponse.json({ok:true,expiresAt:Date.now()+600000},{headers:{'Cache-Control':'no-store'}});
}
