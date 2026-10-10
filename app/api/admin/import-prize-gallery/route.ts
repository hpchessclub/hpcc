import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {getCurrentAdmin} from '@/lib/auth';
import {canAccess} from '@/lib/roles';
import {createSupabaseServiceClient} from '@/lib/supabase/service';
import {PRIZE_GALLERY_SOURCE,PRIZE_ALBUM_NAME,parsePrizePhotos} from '@/lib/importPrizeGallery';
export const maxDuration=60;
export async function POST(req:Request){
 const admin=await getCurrentAdmin();if(!admin)return NextResponse.json({error:'Not authorised'},{status:401});
 if(!canAccess(admin.profile.role,'gallery'))return NextResponse.json({error:'Permission denied'},{status:403});
 try{
  const body=await req.json();if(!['preview','import'].includes(body.action))throw new Error('Invalid import action.');
  const response=await fetch(PRIZE_GALLERY_SOURCE,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Source gallery is unavailable.');
  const html=await response.text();if(html.length>1000000)throw new Error('Source page is too large.');const photos=parsePrizePhotos(html);
  if(body.action==='preview')return NextResponse.json({photos,album:PRIZE_ALBUM_NAME});
  if(JSON.stringify(body.photos)!==JSON.stringify(photos))throw new Error('The source changed. Preview the photographs again.');
  const s=createSupabaseServiceClient();const {error:schemaError}=await s.from('gallery_photos').select('id,event_name').limit(0);if(schemaError)throw new Error('Event album configuration is unavailable. Check the gallery migration before importing.');
  let saved=0;
  for(let i=0;i<photos.length;i+=3){
   const outcomes=await Promise.allSettled(photos.slice(i,i+3).map(async photo=>{
    const hash=createHash('sha256').update(photo.url).digest('hex');const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
    const {data:existing,error:readError}=await s.from('gallery_photos').select('id,event_name,image_url').eq('id',id).maybeSingle();if(readError)throw new Error(readError.message);if(existing){if(existing.event_name!==PRIZE_ALBUM_NAME)throw new Error('A source photograph already belongs to another album; review it first.');return;}
    const image=await fetch(photo.url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!image.ok)throw new Error(`Unable to retrieve ${photo.caption}.`);
    const bytes=Buffer.from(await image.arrayBuffer());if(bytes.length>10000000||bytes.length<12||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw new Error('Source image is not a supported WebP photograph.');
    const path=`imports/annual-prize-giving/${hash}.webp`;const {error:uploadError}=await s.storage.from('gallery-images').upload(path,bytes,{contentType:'image/webp',upsert:true});if(uploadError)throw new Error(uploadError.message);
    const {data:publicUrl}=s.storage.from('gallery-images').getPublicUrl(path);
    const {error:insertError}=await s.from('gallery_photos').upsert({id,event_name:PRIZE_ALBUM_NAME,event_date:null,title:photo.caption,description:`Trophies, shields and their winners at the clubrooms.\nSource: ${PRIZE_GALLERY_SOURCE}`,image_url:publicUrl.publicUrl,is_published:true,created_by:admin.user.id},{onConflict:'id',ignoreDuplicates:true});if(insertError)throw new Error(insertError.message);
    const {data:verified,error:verifyError}=await s.from('gallery_photos').select('id,event_name,image_url,is_published').eq('id',id).single();if(verifyError||!verified||verified.event_name!==PRIZE_ALBUM_NAME||verified.image_url!==publicUrl.publicUrl||!verified.is_published)throw new Error('The saved photograph could not be verified.');
   }));
   for(const outcome of outcomes){if(outcome.status==='fulfilled')saved++;}
   const failed=outcomes.find(o=>o.status==='rejected');if(failed?.status==='rejected')throw new Error(`${saved} photographs verified before an import failed: ${failed.reason instanceof Error?failed.reason.message:'Unknown error'}. Retry safely; existing photos are retained.`);
  }
  revalidatePath('/');revalidatePath('/photo-gallery');revalidatePath('/club-admin/photo-gallery');
  return NextResponse.json({ok:true,count:saved});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to import photographs.'},{status:400});}
}
