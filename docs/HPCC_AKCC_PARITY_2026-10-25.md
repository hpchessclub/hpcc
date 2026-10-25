# HPCC membership and tournament parity review
Revision 2026.10.25.2 - 25 October 2026

Reference reviewed read-only: `volgasystems/auckland-knights-chess-club` main at `0a95625fd1130a79174e216e137efc87d6c686ff`, including the latest 50 commit summaries and the relevant membership, tournament, public players, admin reports, payment/reminder and editing implementations. HPCC base: `1d91279574bb38c7107de992fed820ede792abe0`.

## Already implemented in HPCC and retained
- Configurable membership prices, authoritative server fees, renewal flow and numbering. Existing IDs are not changed. Imported historic missing DOB stays permitted; new registration requires DOB, email and phone.
- Lookup of existing members regardless of payment status, with active-member eligibility for club tournaments. HPCC free club-event registration is retained. General/open events remain open to everyone; tournament fees are independent of membership fees.
- Stripe confirmation/verification, full-refund cancellation and replay protection, deterministic duplicate protection and separate registration/payment emails.
- Canonical/legacy bank accounts, membership/tournament defaults, tentative bank entries, instruction snapshots, audited approvals and existing-entry resume links.
- Compact membership and tournament reports, private Player/Vega preparation report, allowlisted entry editing, unpaid deletion checks, popup PDF previews and bank/payment tracking columns.
- Dashboard charts, filters and separate payment totals; explicit photography permission, guardian/policy snapshots; 10-minute inactivity, private profile/password flows.

## Gaps implemented in this release
- Public View Entries: registration/name/FIDE/NZCF sorting, separate ratings, disclosed gender, FIDE titles and linked profiles, club initials with full-name tooltips, striped rows, empty state and styled real XLSX export matching sorting.
- Both player page and export enforce Show public entries and public event status; public queries use allowlisted fields, paginate beyond 1,000 rows and fail safely. No DOB, email, phone, member ID, consent, bank reference or Stripe identifier appears in public output. FIDE title requests are cached and bounded to six at a time; unavailable data stays blank.
- Tournament gender immediately after DOB, server validation, member-lookup gender, private report option and allowlisted admin editing. Membership gender moved immediately after DOB and validated server-side. Browser DOB maximums reject future dates. Communication/terms consent and payment method values are explicitly validated.
- Legacy schemas are probed: absent tournament gender does not break registrations or old public lists, and the submitted answer is retained in the private consent snapshot. The dedicated field and normal gender maintenance require additive v4_9. Historical gender is not guessed or automatically backfilled.
- Public general-tournament messaging separates tournament fees from club membership; the membership joining link appears in the club-event flow. Stripe availability does not disable bank registration. HPCC free club-event rules remain intact.
- Registration close is enforced on the server and public registration page; date-only closing dates use the New Zealand end of day. Draft/archived tournament records are excluded from public listing/details.
- Register and View Entries actions added to relevant homepage tournament cards and View Entries to enabled club cards. All HPCC branding, hero, compact programme cards, content and absence links are preserved.
- Pending Stripe reminders follow a first-day/three-day/final-day cadence and at least 24 hours between sends. Full tournaments are excluded and capacity rechecked before sending. Admin/Super Admin can preview candidates and explicitly confirm due reminders through the same checked pipeline. Preview sends nothing. Manual and scheduled sends remain disabled unless HPCC configuration enables them. Provider acceptance is not proof of delivery or opening.
- Dashboard metric cards open the respective management records. Membership/enquiry links stay club-wide under tournament filters.
- Documentation page, Deployment PDF and Admin/Super Admin PDF updated to revision 2026.10.25.2.

## Tests and deployment boundaries
133 tests passed using fake providers, fake records, ExcelJS round-trip inspection and isolated PostgreSQL (PGlite). TypeScript and the production build passed. Both PDF guides were rendered and visually checked. No real email, payment, refund, deletion, membership update or migration was used for testing. The existing idempotent HPCC news publication hook preserves already-created news rows.

## SQL and external configuration
Inspect and back up the actual HPCC Supabase schema before applying `supabase/migration_v4_9_tournament_gender.sql`. The migration only adds a nullable column and a future-write check, and is repeatable. It is not applied by deployment. Missing historical values remain missing. Existing v4_8 remains necessary for bank approval RPCs/defaults and reminder logs; this release does not replace it. Actual production schema access was not available in this session, so no claim of production migration completion is made.

HPCC bank accounts/defaults/event overrides, Stripe/webhook and email settings, HTTPS site URL, CRON_SECRET and ENABLE_PAYMENT_REMINDERS remain HPCC-owned configuration. No AKCC contacts, bank details, secrets, Auth users or production records were imported. Public player availability remains controlled by the tournament administrator. Live verification is read-only; authenticated editing/sending/payment workflows are tested with fixtures, not real records.
