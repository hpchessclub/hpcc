export const GENDERS=["Male","Female","Non-binary","Prefer not to say","Other"] as const;
export function validGender(value:unknown){return typeof value==='string'&&(GENDERS as readonly string[]).includes(value);}
export function missingGenderColumn(error:any){return ['42703','PGRST204'].includes(error?.code)&&/gender/i.test(error?.message||'');}
export async function genderColumnAvailable(s:any){const {error}=await s.from('tournament_registrations').select('gender').limit(0);if(!error)return true;if(missingGenderColumn(error))return false;throw new Error('Unable to check tournament registration fields. Please try again.');}
