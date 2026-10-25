export const MEMBERSHIP_REGISTRATION_POLICY="Quiet play and respectful behaviour are required. Do not interfere with another player’s game. Parents/guardians are responsible for young children before and after sessions. Membership subscription fees are not refundable or transferable once processed.";
export const POLICY_REVISION='HPCC-2026-10-25';
export function registrationPolicy(body:any,tournament?:any,now=new Date()){
 if(!['yes','no'].includes(body.photography))throw new Error('Please explicitly select Yes or No for photography. No does not prevent registration.');
 if(![true,'true','on'].includes(body.policy_accepted))throw new Error('Please accept the registration and cancellation policy.');
 const dob=String(body.date_of_birth||'');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const age=Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
 const guardian=String(body.guardian_name||body.parent_guardian_name||[body.parent_guardian_first_name,body.parent_guardian_last_name].filter(Boolean).join(' ')).trim();
 if(age<18&&(!guardian||guardian.length>200||!['on',true,'true'].includes(body.guardian_consent)))throw new Error('For a player under 18, a parent/guardian name and consent are required.');
 return {revision:POLICY_REVISION,accepted_at:now.toISOString(),photography:body.photography,policy_accepted:true,under_18:age<18,guardian_name:age<18?guardian:null,guardian_consent:age<18,policy:tournament?.registration_policy||'No specific cancellation/refund policy has been configured. Contact the club before paying.'};
}
export async function recordPolicy(s:any,id:string,kind:string,snapshot:any){const {error}=await s.from('audit_logs').insert({action:'registration_policy_accepted',entity_type:kind,entity_id:id,summary:snapshot});if(error)throw new Error('Registration policy could not be recorded. Contact the club before paying.');}
