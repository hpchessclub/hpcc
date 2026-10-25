export const COMMITTEE_SLUG='hpcc-internal-committee-years';
export const COMMITTEE_ROLES=[{key:'president',label:'President'},{key:'secretary',label:'Secretary'},{key:'treasurer',label:'Treasurer'},{key:'senior',label:'Senior Club Captain'},{key:'junior',label:'Junior Club Captain'}] as const;
export type CommitteePerson={name:string;email:string;phone:string};
export type CommitteeYear={year:number;published:boolean;officers:Record<string,CommitteePerson>;members:string[]};
export type CommitteeConfig={activeYear:number;years:CommitteeYear[]};
export const COMMITTEE_CONTACT_KEYS=['club_secretary_name','club_secretary_email','club_secretary_phone','additional_committee_members',...['senior','junior'].flatMap(role=>['name','email','phone'].map(field=>`${role}_club_captain_${field}`))];
export function blankCommittee(year:number):CommitteeYear{return {year,published:false,officers:Object.fromEntries(COMMITTEE_ROLES.map(r=>[r.key,{name:'',email:'',phone:''}])),members:[]};}
export function legacyCommittee(settings:any):CommitteeConfig{
 const row=blankCommittee(2026);row.published=true;
 row.officers.president={name:'FM Martin Dreyer',email:'martin@dandd.co.nz',phone:''};row.officers.treasurer={name:'Mathew Gosling',email:'matthew.gosling99@gmail.com',phone:''};
 for(const role of ['secretary','senior','junior']){const prefix=role==='secretary'?'club_secretary':`${role}_club_captain`;row.officers[role]=Object.fromEntries(['name','email','phone'].map(k=>[k,String(settings[`${prefix}_${k}`]||'')])) as CommitteePerson;}
 row.members=settings.additional_committee_members||[];return {activeYear:2026,years:[row]};
}
export function validateCommittee(input:any):CommitteeConfig{
 if(!input||!Array.isArray(input.years)||input.years.length<1||input.years.length>100)throw Error('Include between 1 and 100 committee years.');
 const seen=new Set<number>();const years:CommitteeYear[]=input.years.map((row:any)=>{
  if(!row||!Number.isInteger(row.year)||row.year<1900||row.year>2200||seen.has(row.year))throw Error('Each committee year must be unique and between 1900 and 2200.');seen.add(row.year);
  if(typeof row.published!=='boolean')throw Error('Invalid committee publication state.');const out=blankCommittee(row.year);out.published=row.published;
  for(const {key,label}of COMMITTEE_ROLES){const person=row.officers?.[key];if(!person)throw Error(`Enter the ${label} fields, or leave them blank.`);for(const field of ['name','email','phone'] as const){if(typeof person[field]!=='string'||person[field].length>254)throw Error(`Invalid ${label} ${field}.`);out.officers[key][field]=person[field].trim();}if(out.officers[key].email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.officers[key].email))throw Error(`Enter a valid ${label} email.`);}
  if(!Array.isArray(row.members)||row.members.length>100||row.members.some((v:any)=>typeof v!=='string'||v.length>200))throw Error('Enter up to 100 additional committee member names.');out.members=[...new Set<string>(row.members.map((v:string)=>v.trim()).filter(Boolean))];return out;
 });
 if(!Number.isInteger(input.activeYear)||!years.some(y=>y.year===input.activeYear&&y.published))throw Error('The current committee must be a published year.');
 if(years.some(y=>y.published&&!Object.values(y.officers).some(p=>p.name)))throw Error('A published committee needs at least one named officer.');
 return {activeYear:input.activeYear,years};
}
export function committeeContacts(row:CommitteeYear){const out:any={additional_committee_members:row.members};for(const role of ['secretary','senior','junior']){const prefix=role==='secretary'?'club_secretary':`${role}_club_captain`;for(const key of ['name','email','phone'])out[`${prefix}_${key}`]=row.officers[role][key];}return out;}
