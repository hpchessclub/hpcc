import {missingGenderColumn} from '@/lib/registrationGender';
// Never select contact details, DOB, consent, member IDs or payment identifiers.
export const PUBLIC_PLAYER_FIELDS='first_name,last_name,fide_id,fide_rating,nzcf_rating,club_name,school_name,created_at';
export async function readPublicPlayers(s:any,tournamentId:string){
 async function read(fields:string){const rows:any[]=[];for(let offset=0;;offset+=500){const {data,error}=await s.from('tournament_registrations').select(fields).eq('tournament_id',tournamentId).eq('payment_status','paid').eq('registration_status','confirmed').order('created_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);if(error)return {data:null,error};rows.push(...(data||[]));if(!data||data.length<500)return {data:rows,error:null};}}
 let result=await read(`${PUBLIC_PLAYER_FIELDS},gender`);
 if(missingGenderColumn(result.error))result=await read(PUBLIC_PLAYER_FIELDS);
 if(result.error)throw new Error('Registered players are temporarily unavailable.');
 return result.data||[];
}
export function publicEntriesEnabled(t:any){return !!t&&t.show_public_entries===true&&['open','closed','completed'].includes(t.status);}
