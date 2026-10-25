import {normalizeAccount} from "@/lib/bankAccounts";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
export default async function Accounts() {
  await requireAdmin("payment_accounts");
  const {data,error} = await createSupabaseServiceClient().from("payment_accounts").select("*");
  if (error) return <div className="card p-6"><h1 className="text-3xl font-bold">Payment Accounts</h1><p className="mt-4">Payment accounts are unavailable. Apply supabase/migrations/20261009_payment_accounts.sql in the Supabase SQL editor, then refresh. If already applied, check database connectivity.</p></div>;
  return <div><p className="mb-4 text-sm">Add multiple accounts, then select an account when editing a tournament or calendar event. Use the exact bank-recorded holder name for each account. Set the membership default separately, and select the correct account on each tournament. Keep savings or deposit accounts inactive unless approved for registration payments. Referenced accounts must be deactivated rather than deleted. This page controls bank-transfer instructions; Stripe card payout settings are configured separately.</p><CrudManager table="payment_accounts" title="Manage Payment Accounts" rows={(data || []).map(normalizeAccount)} initialValues={{is_active:true}} fields={[
    {name:"name",label:"Bank account holder name (exact)",required:true,help:"Use the name recorded by the bank for this particular account. It may differ from the club name."}, {name:"code",label:"Code / usage",required:true},
    {name:"account_number",label:"Account number",required:true}, {name:"purpose",label:"Purpose",required:true},
    {name:"is_active",label:"Active",type:"checkbox"},{name:"is_default_membership",label:"Default for membership bank transfers",type:"checkbox"},{name:"is_default_tournament",label:"Default for tournament bank transfers",type:"checkbox"}
  ]}/></div>;
}
