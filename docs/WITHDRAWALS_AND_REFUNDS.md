# HPCC tournament withdrawals and refunds
Revision 2026.11.02 · 2 November 2026

## Setup

Apply `supabase/migration_v4_10_withdrawals_refunds.sql` to the **existing HPCC Supabase project**. It is additive and repeatable. Do not run a reset/rebuild script. It creates a private review table, service-only RPCs, audit records and a trigger that keeps withdrawn entries cancelled. Deploying code alone does not apply this migration.

Use HPCC's existing Stripe keys and webhook secret. For automatic asynchronous refund updates, subscribe the existing HPCC Stripe webhook to `refund.created`, `refund.updated` and `refund.failed` in addition to its existing checkout/charge events. The admin Check Stripe refund status action also retrieves the actual refund directly. No new credentials or bank details belong in source control.

## Withdraw an entry

1. Open Tournament Registrations. Admin/Super Admin can choose **Withdraw entry** on an entry that is not already cancelled.
2. Enter the player's reason and choose whether to request refund review. This is an admin-assisted request; no unauthenticated public withdrawal form is exposed.
3. Confirm withdrawal. An unpaid open checkout is expired first; failed checks stop the action. The database saves a private original-registration/policy snapshot, actor and timestamp, then cancels the entry atomically.
4. The player disappears from confirmed lists and paid-confirmed player exports, and payment reminders/resume are blocked. Original registration, member linkage, Stripe IDs, payment receipts and history remain.

## Review a refund

Open **Tournament Registrations → Withdrawals & refunds**. Filter by event or review status. Review the accepted policy snapshot, original payment, withdrawal reason and any previous refunds. Old registrations may have no recorded policy; do not invent one. The current event policy is shown separately and may differ from the accepted policy.

- **Decline:** enter a reason. The entry remains withdrawn.
- **Stripe:** enter the approved NZD amount (full or partial), acknowledge policy review, and explicitly confirm. The server validates the linked completed NZD checkout, registration, original amount, live/test mode and remaining refundable charge. It records the approval before contacting Stripe. Stripe returns money to the original payment method; the site never asks for card details. Pending refunds stay Processing until Stripe verifies success.
- **Cash/bank/other:** pay the refund outside this website first, then record its amount, method, actual completed transaction reference and review note. A verified paid receipt and acknowledgement are required. Manual recording cannot be used for a linked Stripe checkout/payment.

Approvals record the reviewing admin and time, approved amount, method, note and refund reference/Stripe refund ID. The original payment receipt amount is retained. Partial refunds are tracked separately and do not mark the original payment fully refunded. A verified full refund marks payment Refunded; the registration remains cancelled.

## Retry and reconciliation

Repeated withdrawal requests reuse the existing record. Stripe uses one stable idempotency key per approved refund and checks existing refund metadata before creation. If an API response is lost, use **Check Stripe refund status**. Do not make a second refund in Stripe just because the browser reports a timeout.

An uncertain request older than 15 minutes will not create another Stripe refund. If no matching refund can be found, or Stripe reports failed/cancelled, a technical administrator must reconcile the request with Stripe. The site deliberately does not automatically issue a replacement. Refund requests already completed/declined are not reopened by this workflow.

Delayed successful checkout callbacks record payment without re-confirming or emailing a withdrawn player. The database trigger also prevents older clients/webhooks restoring confirmed status. Fully refunded charges retain their existing reconciliation behavior. Public player exports remain limited to the existing safe player fields; private withdrawal/policy/contact/payment details are not added.

## Limits and validation

This workflow covers tournament entries, not membership cancellation. It does not automatically email a withdrawal/refund notice; contact the player separately through the club's normal process. A saved refund means Stripe verified success or an admin explicitly recorded a completed external refund, not a promise of bank settlement time. No real refunds, emails, deletions or withdrawals are needed for tests.

Run `node --test tests/*.test.cjs tests/*.test.mjs`, `npx tsc --noEmit` and `npm run build`. The SQL tests use isolated PGlite fixtures and apply the migration twice. API/Stripe tests use fake payments only.
