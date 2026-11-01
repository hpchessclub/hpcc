# HPCC tournament withdrawal and full-refund tracking
Revision 2026.11.02c · 2 November 2026

## Activation (existing HPCC Supabase project only)

Apply `supabase/migration_v4_10_withdrawals_refunds.sql` if not already installed, then `supabase/migration_v4_11_full_refund_tracking.sql`. Both are additive/repeatable. Do not reset/rebuild any tables. v4_11 keeps original registrations, receipts and earlier audit history. It normalizes review statuses, preserves a private snapshot of previous decisions, and disables obsolete financial functions. An old partial refund stays Pending for full-fee review; it is not silently promoted to Completed.

Use HPCC's existing Stripe configuration only. No new secrets or bank details are required. The website **does not issue Stripe refunds or send bank payments**. Refund completion is an explicit Admin/Super Admin verification; refund webhook events alone do not complete the withdrawal review. Existing signed charge/checkout reconciliation remains, and checks successful full refunds before changing payment state.

## Compact actions

In Tournament Registrations, the green banknote icon is **Confirm cash / bank**. It remains available for eligible unpaid pending entries, independently of the amber **Withdraw / Refund** icon. Hover for tooltips; icons have accessible labels. Rows wrap action icons. Paid, refunded, withdrawn and bank-reference records do not expose a delete action. The server also rejects deletion of withdrawn records.

Cash/bank confirmation retains Cash, Bank transfer and Other verified payment, required reference/note, full-payment acknowledgement and the approver/time audit. Completed/processing Stripe checkouts must use Stripe verification. Withdrawal does not replace confirmation.

## Withdraw a player

1. Admin/Super Admin clicks the amber Withdraw / Refund icon on a registration.
2. Read the applicable cancellation/refund policy. Accepted policy text is preferred; current event policy/original arrangements are explicitly identified when no accepted snapshot exists. A missing policy is not invented.
3. Enter a reason and explicitly acknowledge policy review. Choose **Full entry fee due** or **No refund due**. Unpaid/free entries always have zero due and Not required status, regardless of any client-supplied amount.
4. Confirm withdrawal. An unpaid open checkout is expired first. A completed/processing checkout with unverified payment is blocked until Stripe verification. The entry becomes cancelled, is excluded from confirmed/public lists and confirmed-player exports, and cannot resume payment or receive reminders. The original registration/member linkage, payment identifiers, policy snapshot and receipts remain.

Repeated requests reuse the same withdrawal and do not add duplicate audit records. Database guards and webhook checks prevent late payment/expiry callbacks restoring a withdrawn entry.

## Full-fee refund tracking

Refund review is independent of registration and payment status:

- **Pending:** a full entry fee is due; completion has not been verified. The original payment remains recorded as paid until a successful refund is verified.
- **Completed:** the full fee was verified in Stripe or an admin recorded its completed external return. Approver, timestamps, method, full amount and references are retained. Original receipt amounts are not overwritten.
- **Not required:** no refund is due, including unpaid/free withdrawals. No refund amount is created.

### Stripe

Issue the refund in the HPCC Stripe dashboard first, to the original payment method. Then use **Verify full refund in Stripe** in HPCC. This action only reads Stripe and records verification; it never creates a refund.

HPCC verifies the linked checkout/payment intent, registration/tournament metadata, original amount, NZD currency, live/test mode, fully refunded charge and successful refund records totaling exactly the full fee. Partial, pending, failed, mismatched or ambiguous refunds do not complete the workflow. A Stripe-linked payment cannot be completed as a cash/bank refund. Repeating verification does not create another receipt/refund/audit entry.

### Cash / bank / other verified payment

Return the full fee outside the website first. Then choose the method, provide the actual transaction/receipt reference and note, and acknowledge that the **full fee** was returned. The server requires a verified paid receipt for that amount and rejects Stripe-linked records. HPCC records completion; it does not move money.

## Reports and exports

Tournament Registrations and the admin Player / Vega report offer registration-status and refund-status filters. To view withdrawn players in the player report choose **All registrations**, then Withdrawn/cancelled. Public lists continue to include only paid confirmed players and expose no new private data.

Choose export columns **Withdrawn at, Withdrawal reason, Refund status, Refund due, Refund reference** in Tournament Registrations. CSV and PDF use the same enrichment and filters as the report. Withdrawal/refund status appears on the player row. If SQL is missing, refund filters/exports fail clearly rather than returning an unfiltered report; ordinary registration and cash/bank actions remain available.

Tournament withdrawal does not implicitly cancel membership. Use the separate Members action described below. Neither withdrawal workflow sends emails. Contact the participant through normal club processes. Do not use real registrations, refunds, deletions or emails for tests.

## Validation

Run `node --test tests/*.test.cjs tests/*.test.mjs`, `npx tsc --noEmit`, and `npm run build`. Isolated PGlite tests apply migrations twice and test private access, full-only completion, zero unpaid refund due, audit/receipt retry safety and late-event cancellation guards. Stripe tests use fixtures and assert no refund-creation calls.

## Membership withdrawal and refunds (v4_12)

Memberships now use the same amber **Withdraw / Refund** and green **Confirm cash / bank** actions in **Members**. Apply `supabase/migration_v4_12_membership_withdrawals.sql` after the existing membership-renewal v4_6 and bank/approval v4_8 migrations. It is additive/repeatable and does not require resetting data. Tournament activation still uses its own v4_10/v4_11 migrations.

Review the actual accepted membership policy before cancellation. The default subscription policy is non-refundable; an admin deciding on a refund exception must explicitly choose full-fee due, acknowledge policy review and record the reason. No policy is silently changed or refund promised by the website.

Choose the **original membership payment or a particular renewal** before withdrawal. The default is the latest paid renewal where one exists. The selected payment, its amount/Stripe identity and the membership/accepted-policy snapshot are saved privately. Unpaid/free selections have zero due. Membership is cancelled, so it no longer grants active club-member eligibility. Member ID, membership dates, original receipts, all renewals and tournament registrations remain. Cancel tournament entries separately when needed.

Refund statuses are Pending, Completed and Not required. Issue a Stripe refund in Stripe first, then verify the selected full-fee refund in HPCC. Payment type, member/renewal IDs, checkout, intent, NZD, mode, amount and successful full-refund records must match. Offline completion needs an existing paid receipt for the selected payment, full-return acknowledgement, method and actual transaction reference. Stripe-linked selections cannot be recorded as offline refunds. HPCC does not issue Stripe refunds or send bank payments.

Refunding a renewal changes only that renewal and its receipt. It does not refund the original joining payment or other renewals. Refunding the original joining payment likewise does not alter unrelated renewal receipts. Original receipt amounts and all history remain; status changes occur only after verification. Repeated requests/verification do not duplicate receipts or audit entries.

The green membership confirmation action now supports Cash, Bank transfer and Other verified payment with a required note and full-payment acknowledgement. Existing completed/processing Stripe safeguards and atomic membership-ID assignment remain. Financial status cannot be overwritten through the generic maintenance form. Paid/refunded/withdrawn members, members with an assigned member ID, and records with bank/renewal/payment history cannot be deleted. Unpaid, unnumbered records can only be deleted after history and linked checkout checks, with database removal verified.

Use the Members status/refund filters and the same selectable withdrawal/refund CSV/PDF columns. Amber actions open the review for an already-withdrawn membership. The withdrawal guard prevents late payment/expiry callbacks restoring active membership or changing member IDs. A late verified initial/renewal payment retains its receipt without extending membership validity or sending a confirmation email. Any money arriving after cancellation needs separate admin review; it does not automatically create a refund obligation.
