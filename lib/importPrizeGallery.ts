export const PRIZE_GALLERY_SOURCE='http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com/gallery/';
export const PRIZE_ALBUM_NAME='Annual Prize Giving';
export type PrizePhoto={url:string;caption:string};
export function parsePrizePhotos(html:string):PrizePhoto[]{
 const section=[...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)].find(m=>/id=["']prizegivings-heading["']/.test(m[1]))?.[1];
 if(!section)throw new Error('The Prize-givings section was not found.');
 const photos:PrizePhoto[]=[];
 for(const match of section.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  if(!/<img\b/.test(match[2]))continue;
  const url=new URL(match[1],PRIZE_GALLERY_SOURCE);
  if(url.hostname!=='hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com'||!/^\/img\/[a-zA-Z0-9._-]+\.webp$/.test(url.pathname))throw new Error('Unexpected source image link.');
  const caption=(match[2].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'Prize-giving photograph').replace(/<[^>]*>/g,'').replace(/^Open photo \d+ of \d+:\s*/,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').trim();
  photos.push({url:url.href,caption});
 }
 if(!photos.length||photos.length>100)throw new Error('No prize-giving photographs were found.');
 if(new Set(photos.map(p=>p.url)).size!==photos.length)throw new Error('Duplicate source photographs need review.');
 return photos;
}
