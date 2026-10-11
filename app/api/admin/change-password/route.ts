import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  try {
    const supabase = await createSupabaseServerClient();
    const {data,error} = await supabase.auth.updateUser({password:passwords.newPassword,current_password:passwords.currentPassword});
    if (error) {
      const message = error.code === 'invalid_credentials' || error.code === 'reauthentication_not_valid' ? 'Your current password is incorrect.'
        : error.code === 'reauthentication_needed' ? 'Please sign out and sign in again, then retry changing your password.'
        : error.message || 'Unable to change your password. Please try again.';
      return NextResponse.json({error:message},{status:400});
    }
    if (!data.user || data.user.id !== admin.user.id) return NextResponse.json({error:'Password update could not be verified. Please sign in again.'},{status:400});
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Unable to change your password. Please try again.'},{status:500}); }
}
