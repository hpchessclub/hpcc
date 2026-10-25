# HPCC upgrade - 25 October 2026

This release changes only hpchessclub/hpcc. HPCC branding/content and all existing Auth/member/payment records are preserved. No production SQL, bank defaults, email/provider configuration or scheduled sends were changed by validation.

| Request | Before inspection | Implementation |
| --- | --- | --- |
| 1. Statistical dashboard | Basic count cards | Six views, daily bar/line charts, status doughnuts and accessible tables |
| 2. Filters and separate payments | No period/event filters | 7/30/90 days, tournament selection; club-wide membership/enquiries; separate paid receipt series |
| 3. Growth and events | Limited totals | New/cumulative membership and registration growth, active members, upcoming/completed and per-event entry summaries; renewals not new members |
| 4. Enquiries/absences | Basic absence count | Awaiting-action/status reporting; report/player counts per event and round; ambiguous/unmatched names flagged |
| 5. Account saving | Canonical fields only | Independent canonical/legacy alias probes, validated values in every present alias, Save resets after errors |
| 6. Bank defaults | Optional event account | Separate active defaults with unique indexes, event override, ambiguity errors, reference-aware deletion protection |
| 7. Membership transfers | Stripe only | Server-priced bank option, immutable instructions/reference, acknowledgement email, duplicate reuse |
| 8. Tournament transfers | Stripe/free club flow | Event/default bank resolution, server-priced categories and immutable instructions |
| 9. Tentative entries | Pending Stripe state | Tentative bank label, no place reservation, excluded from paid revenue/public confirmed lists |
| 10. Audited approval | Tournament manual function | Membership bank plus tournament cash/bank/verified approval; full acknowledgement; atomic audit/receipt/status and idempotency |
| 11. Duplicates/refunds | Tournament identity/refund checks present | Membership/bank concurrency protection, immutable history, no bank deletion, processing guard and existing-entry resume protection |
| 12. Reminders | Absent | Disabled-by-default authenticated daily scheduler, durable daily claims, Stripe check, deadline/duplicate/bank suppression, signed resume links |
| 13. Tracking/emails | Separate acknowledgement/confirmation existed | Bank instructions, real line breaks, failure status, four new report columns; no delivery/open claims |
| 14. Policies/account | Profile/password/idle features existed | Explicit photography Yes/No, guardian rules and snapshots, event-specific policy, clean same-origin logout/login |
| 15. Documentation | PDFs and page existed | Both PDFs revised 2026.10.25, source Markdown, repeatable build script, updated online instructions |

## Validation

111 automated tests passed, including isolated PostgreSQL migration reruns/concurrent bank claims/atomic approvals; role and full-payment checks; photography No/guardian handling; bank alias combinations; dashboard filter/revenue separation; reminder suppression/daily logs; refund replay; signed inactivity tokens and profile field allowlists. TypeScript and production build passed. Both revised PDFs were rendered and visually checked. Only fixtures/test doubles were used; no real payments, refunds, deletions or bulk emails were performed.

Live verification is limited to unauthenticated/public pages, permission rejection, scheduler protection and PDF download checks. Authenticated production payment approval and real delivery are not claimed as live-tested.

## Still required in HPCC configuration

1. Inspect/backup the current HPCC schema and apply `supabase/migration_v4_8_bank_policies_reminders.sql`. Confirm the existing membership ID allocator/validity setup. Do not run the destructive bootstrap rebuild.
2. Configure actual HPCC accounts privately, with one active default per purpose and optional event overrides. Actual bank details are never in these documents or source changes.
3. Configure HPCC sender/Stripe settings and ensure `charge.refunded` is subscribed. Review prior refunds with existing Stripe payment verification.
4. Set private `CRON_SECRET`; enable `ENABLE_PAYMENT_REMINDERS=true` only after authorising actual reminders. The included daily job runs at 20:00 UTC and attempts at most 50 eligible entries per run. Additional authenticated scheduling is needed when volume/closing windows require it. No automatic bulk sends are enabled by the source change alone.
5. Review tournament-specific cancellation/refund policies. Consent and payment data remain private; detailed exports require admin access.

Detailed procedures: `docs/hpcc_deployment_guide.md` and `docs/hpcc_admin_super_admin_user_guide.md`. Public domain routing is not changed by this release.
