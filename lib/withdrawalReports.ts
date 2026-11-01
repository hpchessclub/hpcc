export const WITHDRAWAL_COLUMNS=['withdrawn_at','withdrawal_reason','refund_status','refund_due','refund_reference'];
export function refundStatusLabel(value:any){return ({pending:'Pending',completed:'Completed',not_required:'Not required'} as Record<string,string>)[value]||String(value||'Not required');}
export async function attachWithdrawalReports(s:any,rows:any[],filters:{registration_status?:string|null;refund_status?:string|null}={},required=false){
 const map=new Map<string,any>();
 for(let offset=0;offset<rows.length;offset+=500){const {data,error}=await s.from('hpcc_tournament_withdrawals').select('registration_id,requested_at,reason,status,refund_due_cents,refund_reference').in('registration_id',rows.slice(offset,offset+500).map(r=>r.id));
 if(error){if(required||filters.refund_status)throw new Error('Withdrawal report setup is unavailable. Apply HPCC v4_10 and v4_11 migrations before filtering/exporting refund details.');return {rows:rows.filter(r=>!filters.registration_status||r.registration_status===filters.registration_status).map(r=>({...r,refund_status:'Unavailable'})),warning:'Withdrawal/refund details unavailable. Apply HPCC v4_10 and v4_11 migrations. Existing registration/payment actions remain available.'};}
 for(const w of data||[])map.set(w.registration_id,w);
 }
 const result=rows.map(r=>{const w=map.get(r.id);return {...r,withdrawn_at:w?.requested_at||'',withdrawal_reason:w?.reason||'',refund_status:w?.status||'not_required',refund_due_cents:w?.refund_due_cents||0,refund_reference:w?.refund_reference||''};}).filter(r=>(!filters.registration_status||r.registration_status===filters.registration_status)&&(!filters.refund_status||r.refund_status===filters.refund_status));
 return {rows:result,warning:''};
}
