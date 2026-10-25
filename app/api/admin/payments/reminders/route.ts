import {NextResponse} from 'next/server';
import {getCurrentAdmin} from '@/lib/auth';
import {createSupabaseServiceClient} from '@/lib/supabase/service';
import {readAll} from '@/lib/readAll';
import {eligibleReminder,reminderDue,playerIdentity} from '@/lib/paymentReminder';
import {GET as runReminders} from '@/app/api/cron/payment-reminders/route';
export const maxDuration=60;
async function allowed(){const admin=await getCurrentAdmin();return admin&&['admin','super_admin'].includes(admin.profile.role);}
export async function GET(req:Request){
 if(!(await allowed()))return NextResponse.json({error:'Not authorised'},{status:403});
 try{
  const selected=new URL(req.url).searchParams.get('tournament_id')||'';if(selected&&!/^[0-9a-f-]{36}$/i.test(selected))return NextResponse.json({error:'Invalid tournament.'},{status:400});
  const s=createSupabaseServiceClient();const {error}=await s.from('hpcc_reminder_log').select('id').limit(0);if(error)return NextResponse.json({ready:false,enabled:false,due:0,message:'Apply the additive HPCC v4_8 migration to enable reminder logs.'});
  const [entries,events]=await Promise.all([readAll(s,'tournament_registrations'),readAll(s,'tournaments')]);const byEvent=new Map(events.map(t=>[t.id,t]));const groups=new Map<string,number>();for(const row of entries)groups.set(playerIdentity(row),(groups.get(playerIdentity(row))||0)+1);
  const due=entries.filter(row=>(!selected||row.tournament_id===selected)&&eligibleReminder(row,byEvent.get(row.tournament_id),groups.get(playerIdentity(row))||0)&&reminderDue(row,byEvent.get(row.tournament_id)));
  return NextResponse.json({ready:true,enabled:process.env.ENABLE_PAYMENT_REMINDERS==='true'&&!!process.env.CRON_SECRET,due:due.length,limit:50,message:'Candidate count only. Full tournaments, daily claims and Stripe states are checked before sending.'});
 }catch{return NextResponse.json({error:'Unable to preview reminders. Check the database configuration.'},{status:503});}
}
export async function POST(req:Request){
 if(!(await allowed()))return NextResponse.json({error:'Not authorised'},{status:403});
 const body=await req.json().catch(()=>({}));if(body.send_due!==true||body.previewed!==true)return NextResponse.json({error:'Preview and confirm due reminders first.'},{status:400});
 if(process.env.ENABLE_PAYMENT_REMINDERS!=='true'||!process.env.CRON_SECRET)return NextResponse.json({error:'Reminders are disabled. Configure HPCC CRON_SECRET and ENABLE_PAYMENT_REMINDERS before sending.'},{status:409});
 const url=new URL('https://hpcc.internal/api/cron/payment-reminders');if(body.tournament_id)url.searchParams.set('tournament_id',String(body.tournament_id));
 return runReminders(new Request(url,{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}}));
}
