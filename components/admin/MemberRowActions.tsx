"use client";
import WithdrawalActions from "./WithdrawalActions";
import ConfirmEntryPayment from "./ConfirmEntryPayment";
import { useState } from "react";
import { Mail, Pencil, Trash2 } from "lucide-react";
import MemberPaymentCheck from "./MemberPaymentCheck";
export default function MemberRowActions({id,email,canEdit,editing,deleteAction,canConfirm=false,canWithdraw=false,canDelete=false,player="Member"}:{id:string;email:string;canConfirm?:boolean;canWithdraw?:boolean;canDelete?:boolean;player?:string;canEdit:boolean;editing:boolean;deleteAction:(data:FormData)=>Promise<void>}) {
 const [message,setMessage] = useState("");
 const editUrl = `/club-admin/members?search=${encodeURIComponent(email)}#member-maintenance`;
 const iconClass = "inline-flex h-9 w-9 shrink-0 items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
 return <div className="max-w-[212px]"><div className="flex flex-wrap items-center gap-1">
  {canEdit && <a href={editUrl} title="Update member details" aria-label="Update member details" className={`${iconClass} bg-stone-900`}><Pencil size={16}/></a>}
  <a href={`mailto:${encodeURIComponent(email)}`} title="Compose email to member" aria-label="Compose email to member" className={`${iconClass} bg-stone-500`}><Mail size={16}/></a>
  {canWithdraw&&<ConfirmEntryPayment id={id} kind="membership" disabledReason={canConfirm?undefined:"No eligible unpaid fee. Paid, refunded, withdrawn, free or Stripe-linked memberships cannot be manually confirmed."}/>}{canWithdraw&&<WithdrawalActions kind="membership" registrationId={id} player={player}/>}
  <MemberPaymentCheck id={id} onResult={setMessage}/>

  {canEdit && canDelete && <form action={deleteAction} onSubmit={e=>{if(!window.confirm("Delete this member permanently? This cannot be undone."))e.preventDefault();}}><input type="hidden" name="id" value={id}/><button type="submit" title="Delete member" aria-label="Delete member" className={`${iconClass} bg-red-600`}><Trash2 size={16}/></button></form>}
 </div>{message && <p role="status" className="mt-2 whitespace-normal break-words text-xs leading-5 text-stone-600">{message}</p>}</div>;
}
