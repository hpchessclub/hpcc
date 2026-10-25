import {NextResponse} from 'next/server';import {revalidatePath} from 'next/cache';
import {getCurrentAdmin} from '@/lib/auth';import {canAccess} from '@/lib/roles';import {createSupabaseServiceClient} from '@/lib/supabase/service';
import {validateCommittee,committeeContacts} from '@/lib/committeeYears';import {readCommittee,writeCommittee} from '@/lib/committeeStorage';import {readClubPublicSettings,saveClubPublicSettings} from '@/lib/clubPublicSettings';
export async function POST(req:Request){const admin=await getCurrentAdmin();if(!admin||!canAccess(admin.profile.role,'settings'))return NextResponse.json({error:'Not authorised'},{status:403});
 try{const body=await req.json(),config=validateCommittee(body.config);const s=createSupabaseServiceClient();const {data:settings,error}=await s.from('club_settings').select('*').eq('id','default').maybeSingle();if(error)throw Error('Club settings could not be loaded.');const current=await readCommittee(s,await readClubPublicSettings(s,settings||{}));if(current.version!==(body.version??null))return NextResponse.json({error:'Committee changed. Reload before saving.'},{status:409});
  if(current.config.years.some(old=>!config.years.some(row=>row.year===old.year)))return NextResponse.json({error:'Previous committee years must be retained. Edit their details rather than removing a year.'},{status:400});
  const version=await writeCommittee(s,config,body.version??null);
  // Keep existing public contact consumers in sync with the explicitly selected year.
  const contacts=committeeContacts(config.years.find(row=>row.year===config.activeYear)!);
  const native=Object.fromEntries(Object.entries(contacts).filter(([key])=>key.startsWith('senior_club_captain_')||key.startsWith('junior_club_captain_')));
  const saved=await s.from('club_settings').update(native).eq('id','default').select('id').single();if(saved.error||!saved.data)throw Error('Year records saved, but current contact sync failed. Reload settings and save again.');await saveClubPublicSettings(s,contacts);
  for(const path of ['/','/about','/contact','/club-admin/settings'])revalidatePath(path);return NextResponse.json({config,version});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save committee.'},{status:400});}}
