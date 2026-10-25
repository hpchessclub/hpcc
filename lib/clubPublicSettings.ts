import {readCommittee} from "@/lib/committeeStorage";
import {committeeContacts} from "@/lib/committeeYears";
export const CLUB_PUBLIC_SETTINGS_SLUG='hpcc-internal-club-public-settings';
export const SECRETARY_FIELDS=['club_secretary_name','club_secretary_email','club_secretary_phone'] as const;
export const committeeDefaults=['Tony Booth (Life Member)','IO CM Paul Spiller MNZM','Ludi Zhang','Bharat Somaraju','Barry Hooton','WCM Weiyang Yu','FM Ewen Green (Life Member)','Vyshnavi Bandi'];
export const secretaryDefaults={club_secretary_name:'Winnie Ong',club_secretary_email:'hpchess.winnie@gmail.com',club_secretary_phone:''};
export function validateClubPublicSettings(input:any){
 const out:any={};for(const key of SECRETARY_FIELDS){const value=input[key]??'';if(typeof value!=='string'||value.length>254)throw Error('Enter valid secretary contact details (maximum 254 characters per field).');out[key]=value.trim();}
 if(out.club_secretary_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.club_secretary_email))throw Error('Enter a valid secretary email address.');
 if(!Array.isArray(input.additional_committee_members)||input.additional_committee_members.length>100||input.additional_committee_members.some((v:any)=>typeof v!=='string'||v.length>200))throw Error('Enter committee member names, one per line (up to 100 names).');
 out.additional_committee_members=[...new Set(input.additional_committee_members.map((v:string)=>v.trim()).filter(Boolean))];return out;
}
export async function readClubPublicSettings(s:any,settings:any={}){
 const {data,error}=await s.from('news_posts').select('content').eq('slug',CLUB_PUBLIC_SETTINGS_SLUG).maybeSingle();if(error)throw Error('Club contact settings could not be loaded.');
 const configured=data?validateClubPublicSettings(JSON.parse(data.content)):{};
 const legacy={...secretaryDefaults,...settings,additional_committee_members:committeeDefaults,...configured};
 const {config}=await readCommittee(s,legacy);const active=config.years.find(row=>row.year===config.activeYear)!;
 return {...legacy,...committeeContacts(active)};
}
export function clubContacts(settings:any){return [
 {role:'Club Secretary',name:settings?.club_secretary_name,email:settings?.club_secretary_email,phone:settings?.club_secretary_phone},
 {role:'Junior Club Captain',name:settings?.junior_club_captain_name,email:settings?.junior_club_captain_email,phone:settings?.junior_club_captain_phone},
 {role:'Senior Club Captain',name:settings?.senior_club_captain_name,email:settings?.senior_club_captain_email,phone:settings?.senior_club_captain_phone}
 ].map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,String(value||'').trim()]))) as {role:string;name:string;email:string;phone:string}[];}
export async function saveClubPublicSettings(s:any,values:any){const content=JSON.stringify(validateClubPublicSettings(values));const {data,error}=await s.from('news_posts').upsert({slug:CLUB_PUBLIC_SETTINGS_SLUG,title:'HPCC public club contacts and committee settings (internal)',content,is_published:false,publish_to_social:false,updated_at:new Date().toISOString()},{onConflict:'slug'}).select('content').single();if(error||data?.content!==content)throw Error('Public contact settings could not be verified. Please reload and check before retrying.');}
