export function registrationActionPermissions(role:string,row:any){
 const financial=['admin','super_admin'].includes(role);
 const pending=['pending_payment','unpaid','failed','expired'].includes(row.payment_status)&&row.registration_status!=='cancelled';
 return {canWithdraw:financial,canConfirm:financial&&pending&&Number(row.entry_fee_cents)>0&&!row.stripe_payment_intent_id,canDelete:financial&&pending&&row.payment_method!=='bank_transfer'&&!row.stripe_payment_intent_id};
}
