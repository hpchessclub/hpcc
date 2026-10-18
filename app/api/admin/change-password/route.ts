import {clearAdminActivity} from "@/lib/adminSession";
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { validatePasswordChange } from '@/lib/passwordChange';
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({error:'Please sign in again.'},{status:401});
  if (!canAccess(admin.profile.role, 'dashboard')) return NextResponse.json({error:'Admin access is required.'},{status:403});
  let passwords;
  try { passwords = validatePasswordChange(await req.json()); }
  catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : 'Invalid password details.'},{status:400}); }
  // Verify with an isolated, non-persistent client so a failed attempt cannot
  // replace the signed-in administrator's cookies or rely on a project flag.
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  try {
    if (!admin.user.email) return NextResponse.json({error:'This account does not have a password login.'},{status:400});
    const verified = await verifier.auth.signInWithPassword({email:admin.user.email,password:passwords.currentPassword});
    if (verified.error) return NextResponse.json({error:verified.error.code === 'invalid_credentials' ? 'Your current password is incorrect.' : 'Unable to verify your current password. Please try again.'},{status:400});
    if (verified.data.user?.id !== admin.user.id) return NextResponse.json({error:'Account verification failed. Please sign in again.'},{status:403});
    const {data,error} = await verifier.auth.updateUser({password:passwords.newPassword,current_password:passwords.currentPassword});
    if (error) {
      const message = error.code === 'invalid_credentials' || error.code === 'reauthentication_not_valid' ? 'Your current password is incorrect.'
        : error.code === 'reauthentication_needed' ? 'Please sign out and sign in again, then retry changing your password.'
        : error.message || 'Unable to change your password. Please try again.';
      return NextResponse.json({error:message},{status:400});
    }
    if (!data.user || data.user.id !== admin.user.id) return NextResponse.json({error:'Password update could not be verified. Please sign in again.'},{status:400});
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({scope:'local'});
    await clearAdminActivity();
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Unable to change your password. Please try again.'},{status:500}); }
  finally { await verifier.auth.signOut({scope:'local'}).catch(() => {}); }
}
