import {Save,Trash2} from "lucide-react";
import WithdrawalActions from "@/components/admin/WithdrawalActions";
import {canDeleteMember,deleteUnpaidMember} from "@/lib/memberDeletion";
import {attachWithdrawalReports,refundStatusLabel,WITHDRAWAL_COLUMNS} from "@/lib/withdrawalReports";
import { applyMemberSearch } from "@/lib/memberSearch";
import PdfPreview from "@/components/admin/PdfPreview";
import MemberRowActions from "@/components/admin/MemberRowActions";
import { memberStatusLabel } from "@/lib/reports";
import { activateMembership } from "@/lib/membershipPayment";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { REPORT_COLUMNS, selectedColumnKeys, selectedColumns, buildReportQuery } from "@/lib/reports";

function formBase(sp: any) {
  return { sort: sp.sort, payment_status: sp.payment_status, membership_type: sp.membership_type, search: sp.search, membership_status: sp.membership_status, reference: sp.reference,refund_status:sp.refund_status };
}

async function updateMemberAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin("members");
  if (admin.profile.role !== "super_admin") throw new Error("Only Super Admin can edit members.");
  const id = String(formData.get("id") || "");
  const payload: any = {
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    membership_status: String(formData.get("membership_status") || "active"),
    payment_status: String(formData.get("payment_status") || "paid"),
    membership_start_date: String(formData.get("membership_start_date") || "") || null,
    membership_end_date: String(formData.get("membership_end_date") || "") || null,
    nzcf_id: String(formData.get("nzcf_id") || ""),
    fide_id: String(formData.get("fide_id") || ""),
    updated_at: new Date().toISOString(),
  };
  const nzcfRating = String(formData.get("nzcf_rating") || "");
  const fideRating = String(formData.get("fide_rating") || "");
  payload.nzcf_rating = nzcfRating ? Number(nzcfRating) : null;
  payload.fide_rating = fideRating ? Number(fideRating) : null;
  const s = createSupabaseServiceClient();
  const currentResult=await s.from('club_memberships').select('*').eq('id',id).single();if(currentResult.error||!currentResult.data)throw Error('Member record unavailable.');const current=currentResult.data;
  if(payload.payment_status!==current.payment_status)throw Error('Use audited payment confirmation or Withdraw / Refund to change payment status.');
  if(payload.membership_status==='cancelled'&&current.membership_status!=='cancelled')throw Error('Use Withdraw / Refund and review the membership policy.');
  if(current.membership_status==='cancelled'&&(payload.membership_status!=='cancelled'||payload.membership_start_date!==(current.membership_start_date||null)||payload.membership_end_date!==(current.membership_end_date||null)))throw Error('Withdrawn membership status and validity history must be retained.');
  let update=s.from("club_memberships").update(payload).eq("id",id);update=current.updated_at?update.eq("updated_at",current.updated_at):update.is("updated_at",null);
  const { data: saved, error } = await update.select("*").single();
  if (error) throw new Error("Member update failed. Changes were not saved.");
  if (payload.membership_status === "active" && ["paid", "manual_paid", "waived"].includes(payload.payment_status)) await activateMembership(s, saved);
  revalidatePath("/club-admin/members");
}

async function deleteMemberAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin("members");
  if (admin.profile.role !== "super_admin") throw new Error("Only Super Admin can delete members.");
  const id = String(formData.get("id") || "");
  const s = createSupabaseServiceClient();
  await deleteUnpaidMember(s,id);
  revalidatePath("/club-admin/members");
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<any> }) {
  const admin = await requireAdmin("members");
  const isSuperAdmin = admin.profile.role === "super_admin";
  const sp = await searchParams;
  const showMaintenance = isSuperAdmin && !!(String(sp.search || "").trim() || String(sp.reference || "").trim());
  const sort = sp.sort || "name";
  const keys = selectedColumnKeys(sp.columns, "members");
  const cols = selectedColumns("members", keys);

  const s = createSupabaseServiceClient();
  let q = s.from("club_memberships").select("*");
  q = applyMemberSearch(q, sp.search);
  if (sp.reference) q = q.ilike("membership_id", String(sp.reference).trim().replace(/[\\%_]/g, "\\$&"));
  if (sp.membership_status) q = q.eq("membership_status", sp.membership_status);
  if (sp.payment_status) q = q.eq("payment_status", sp.payment_status);
  if (sp.membership_type) q = q.contains("membership_options", [{ key: sp.membership_type }]);
  if (sort === "name") q = q.order("last_name").order("first_name");
  else if (sort === "nzcf_desc") q = q.order("nzcf_rating", { ascending: false, nullsFirst: false });
  else if (sort === "nzcf_asc") q = q.order("nzcf_rating", { ascending: true, nullsFirst: false });
  else if (sort === "fide_desc") q = q.order("fide_rating", { ascending: false, nullsFirst: false });
  else if (sort === "fide_asc") q = q.order("fide_rating", { ascending: true, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error: memberError } = await q;
  if (memberError) throw new Error("Member search failed. Please try again.");
  let rows:any[]=data||[];let withdrawalWarning='';try{const result=await attachWithdrawalReports(s,rows,{refund_status:sp.refund_status},keys.some(k=>WITHDRAWAL_COLUMNS.includes(k)),'membership');rows=result.rows;withdrawalWarning=result.warning;}catch(e){rows=[];withdrawalWarning=e instanceof Error?e.message:'Membership refund report unavailable.';}
  const totalAmount = rows.filter((m: any) => ["paid", "manual_paid"].includes(m.payment_status)).reduce((sum: number, m: any) => sum + Number(m.total_amount_cents || 0), 0);
  const paid = rows.filter((m: any) => ["paid", "manual_paid"].includes(m.payment_status)).length;
  const pending = rows.filter((m: any) => m.payment_status === "pending_payment").length;
  const base = formBase(sp);
  const pdfPreview = buildReportQuery(base, "members", keys, "pdf", true);
  const pdfDownload = buildReportQuery(base, "members", keys, "pdf");
  const csvDownload = buildReportQuery(base, "members", keys, "csv");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-normal">Howick-Pakuranga Membership Registration</h1><div className="flex gap-2"><a href="/join" className="btn-primary">Add New</a><a href={csvDownload} className="btn-secondary">Export</a><PdfPreview src={pdfPreview} label="View PDF" /></div></div>
      <p className="mt-2 text-stone-600">Find a player by name, membership ID or registered email. Search results also filter the member records and exports below.</p>
      <p className="mt-2 text-sm text-amber-800">Bank transfers remain tentative until receipt is verified. Select Payment Method and Bank Reference in report columns; Admin and Super Admin can confirm cash, bank transfer or other verified payments with the green action. Use the amber Withdraw / Refund action for membership cancellation and separate refund tracking.</p>
      {isSuperAdmin && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Super Admin mode: edit member details below. Use Withdraw / Refund for cancellation. Paid, refunded, withdrawn or numbered members and their history cannot be deleted.</p>}

      {withdrawalWarning&&<p role="alert" className="mt-3 text-amber-800">{withdrawalWarning}</p>}
      <form className="mt-5 space-y-5 bg-stone-100 p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label><span className="admin-label">Status</span><select name="membership_status" defaultValue={sp.membership_status || ""} className="admin-input"><option value="">ALL</option>{["active","pending_payment","expired","cancelled"].map(status=><option key={status} value={status}>{status==="cancelled"?"Withdrawn / cancelled":memberStatusLabel(status)}</option>)}</select></label>
          <label><span className="admin-label">Sort Order</span><select name="sort" defaultValue={sort} className="admin-input"><option value="name">Name</option><option value="created_at_desc">Newest first</option><option value="nzcf_desc">NZCF rating high to low</option><option value="nzcf_asc">NZCF rating low to high</option><option value="fide_desc">FIDE rating high to low</option><option value="fide_asc">FIDE rating low to high</option></select></label>
          <label><span className="admin-label">Name Search</span><input name="search" defaultValue={sp.search || ""} placeholder="Name or email" className="admin-input" /></label>
          <label><span className="admin-label">Reference Search</span><input name="reference" defaultValue={sp.reference || ""} placeholder="Membership ID" className="admin-input" /></label>
          <div className="flex items-end"><button className="btn-primary">Search</button></div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><select name="payment_status" defaultValue={sp.payment_status || ""} className="admin-input max-w-xs"><option value="">All payment statuses</option>{["paid","manual_paid","waived","pending_payment","failed","expired","refunded"].map(status=><option key={status} value={status}>{memberStatusLabel(status)}</option>)}</select><label>Refund status<select name="refund_status" defaultValue={sp.refund_status||""} className="admin-input"><option value="">All refund statuses</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="not_required">Not required</option></select></label><a href="/club-admin/members" className="text-sm underline">Clear filters</a></div>
        <details><summary className="admin-label mb-2 cursor-pointer">Choose report columns</summary><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{REPORT_COLUMNS.members.map((c) => <label key={c.key} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 text-sm"><input type="checkbox" name="columns" value={c.key} defaultChecked={keys.includes(c.key)} />{c.label}</label>)}</div></details>
        <div className="flex flex-wrap gap-3"><a href={csvDownload} className="btn-secondary py-2">Download CSV</a><a href={pdfDownload} className="btn-secondary py-2">Download PDF</a><PdfPreview src={pdfPreview} /></div>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-4"><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Total members</p><p className="mt-2 text-2xl font-extrabold">{rows.length}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Paid</p><p className="mt-2 text-2xl font-extrabold text-green-700">{paid}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Pending</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{pending}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Paid total</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(totalAmount)}</p></div></section>

      <section className="card mt-6 overflow-hidden"><div className="border-b bg-white p-5"><h2 className="text-xl font-extrabold">Report Preview - Club Members</h2><p className="mt-1 text-sm text-stone-500">Paid and balance reflect the recorded full-payment status. Waived fees have no balance. </p></div><div className="overflow-x-auto"><table className="w-full min-w-[1200px] table-fixed text-sm"><thead className="bg-stone-100 text-left"><tr>{cols.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}<th className="w-[236px] p-3">Actions</th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={cols.length + 1} className="p-5 text-stone-600">No members match this search. Try a name, membership ID or email, or clear the filters.</td></tr>}{rows.map((m: any) => <tr key={m.id} className="border-t">{cols.map((c) => <td key={c.key} className={`p-3 break-words align-top ${c.key === "balance" ? "text-red-600" : c.key === "registered" ? "text-orange-600" : ""}`}>{c.key === "name" ? <><span className="font-semibold text-green-700">{[m.last_name, m.first_name].map(value => String(value || "").trim()).filter(Boolean).join(", ")}</span><br/><span className="text-stone-500">{m.membership_id || "Pending ID"}</span>{m.membership_status==="cancelled"&&<p className="mt-1 text-xs font-bold text-amber-800">Withdrawn / cancelled · Refund: {refundStatusLabel(m.refund_status)}</p>}</> : c.value(m)}</td>)}<td className="p-3"><MemberRowActions player={`${m.first_name} ${m.last_name}`} canWithdraw={["admin","super_admin"].includes(admin.profile.role)} canDelete={canDeleteMember(m)} canConfirm={["admin","super_admin"].includes(admin.profile.role)&&m.membership_status!=="cancelled"&&Number(m.total_amount_cents)>0&&["pending_payment","failed","expired"].includes(m.payment_status)&&!m.stripe_payment_intent_id} id={m.id} email={m.email} canEdit={isSuperAdmin} editing={showMaintenance} deleteAction={deleteMemberAction} /></td></tr>)}</tbody></table></div></section>

      {showMaintenance && <section id="member-maintenance" className="card mt-6 overflow-hidden"><div className="border-b bg-white p-5"><h2 className="text-xl font-extrabold">Super Admin Member Maintenance</h2><p className="mt-1 text-sm text-stone-500">Update member details, permitted status/validity and ratings. Payment changes use the audited confirmation/refund actions. Membership ID is locked and cannot be edited.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-sm"><thead className="bg-stone-100 text-left"><tr><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Membership</th><th className="p-3">Validity</th><th className="p-3">Ratings</th><th className="w-[236px] p-3">Actions</th></tr></thead><tbody>{rows.map((m:any)=><tr key={m.id} className="border-t align-top"><td className="p-3"><form action={updateMemberAction} id={`member-${m.id}`} className="grid gap-2"><input type="hidden" name="id" value={m.id}/><input name="first_name" defaultValue={m.first_name||""} className="admin-input" placeholder="First name"/><input name="last_name" defaultValue={m.last_name||""} className="admin-input" placeholder="Last name"/></form></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="email" defaultValue={m.email||""} className="admin-input" placeholder="Email"/><input form={`member-${m.id}`} name="phone" defaultValue={m.phone||""} className="admin-input" placeholder="Phone"/></div></td><td className="p-3"><div className="grid gap-2"><div className="rounded-lg border border-stone-200 bg-stone-50 p-2"><p className="text-xs font-bold uppercase text-stone-500">Membership ID</p><p className="font-extrabold text-stone-900">{m.membership_id || "Not generated yet"}</p><p className="mt-1 text-xs text-stone-500">Read-only. Auto-generated by the system.</p></div><select form={`member-${m.id}`} name="membership_status" disabled={m.membership_status==="cancelled"} defaultValue={m.membership_status||"active"} className="admin-input"><option value="pending_payment">Pending</option><option value="active">Active</option><option value="expired">Expired</option>{m.membership_status==="cancelled"&&<option value="cancelled">Withdrawn / cancelled</option>}</select>{m.membership_status==="cancelled"&&<input type="hidden" form={`member-${m.id}`} name="membership_status" value="cancelled"/>}<input type="hidden" form={`member-${m.id}`} name="payment_status" value={m.payment_status||""}/><select form={`member-${m.id}`} name="payment_status_display" disabled defaultValue={m.payment_status||"paid"} className="admin-input"><option value="pending_payment">Pending</option><option value="paid">Paid</option><option value="manual_paid">Manual / Bank Transfer Paid</option><option value="waived">Waived</option><option value="failed">Failed</option><option value="expired">Expired</option><option value="refunded">Refunded</option></select></div></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="membership_start_date" type="date" defaultValue={m.membership_start_date||""} className="admin-input"/><input form={`member-${m.id}`} name="membership_end_date" type="date" defaultValue={m.membership_end_date||""} className="admin-input"/></div></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="nzcf_id" defaultValue={m.nzcf_id||""} className="admin-input" placeholder="NZCF ID"/><input form={`member-${m.id}`} name="nzcf_rating" defaultValue={m.nzcf_rating||""} className="admin-input" placeholder="NZCF rating"/><input form={`member-${m.id}`} name="fide_id" defaultValue={m.fide_id||""} className="admin-input" placeholder="FIDE ID"/><input form={`member-${m.id}`} name="fide_rating" defaultValue={m.fide_rating||""} className="admin-input" placeholder="FIDE rating"/></div></td><td className="p-3"><div className="flex flex-wrap gap-1"><button form={`member-${m.id}`} title="Save member changes" aria-label="Save member changes" className="inline-flex h-9 w-9 items-center justify-center bg-green-800 text-white"><Save size={16}/></button><WithdrawalActions kind="membership" registrationId={m.id} player={`${m.first_name} ${m.last_name}`}/>{canDeleteMember(m)&&<form action={deleteMemberAction}><input type="hidden" name="id" value={m.id}/><button title="Delete unpaid unnumbered membership" aria-label="Delete unpaid unnumbered membership" className="inline-flex h-9 w-9 items-center justify-center bg-red-600 text-white"><Trash2 size={16}/></button></form>}</div></td></tr>)}</tbody></table></div></section>}


    </div>
  );
}
