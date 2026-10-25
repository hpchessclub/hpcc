export async function paymentAccountFields(s: any) {
  const {data, error} = await s.from("payment_accounts").select("*");
  if (error) return [];
  return [{name:"payment_account_id", label:"Payment account (optional)", placeholder:"No bank account", choices:(data || []).map((a: any) => ({value:a.id,label:`${a.name||a.account_name||a.bank_account_name} — ${a.code}${a.is_active ? "" : " (inactive)"}`}))}];
}
