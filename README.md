# Howick-Pakuranga Chess Club

Independent Howick-Pakuranga Chess Club application using Next.js, TypeScript, Tailwind CSS and Supabase. HPCC uses its own configuration, credentials and records.

## 25 October 2026 upgrade

The dashboard, bank-transfer registration, audited approvals, reminder/resume flow, policy snapshots and report tracking are documented in [the Deployment Guide](docs/hpcc_deployment_guide.md) and [the Admin Guide](docs/hpcc_admin_super_admin_user_guide.md). Downloadable PDFs are included in `public/docs/` and the admin Documentation page (revision 2026.10.25).

Review and apply `supabase/migration_v4_8_bank_policies_reminders.sql` to HPCC after checking the actual schema and taking a backup. It is additive and repeatable. Code deployment does not apply SQL. Configure HPCC bank defaults and email/Stripe credentials privately. `CRON_SECRET` and `ENABLE_PAYMENT_REMINDERS=true` are needed for actual reminder sending; reminders remain off by default. The daily scheduler is batch-limited; see the deployment guide for capacity and configuration.

Validation: `node --test tests/*.test.cjs tests/*.test.mjs`, `npx tsc --noEmit`, `npm run build`. PDF regeneration: `python scripts/build-hpcc-docs.py` with reportlab installed.

## Legacy bootstrap only - not an upgrade

Do not run the reset below on the existing HPCC database. It is retained only as historical bootstrap information.

## Database rebuild

`supabase/hpcc_rebuild.sql` deletes HPCC application tables and recreates the application schema in one transaction. Replace `REPLACE_WITH_HPCC_AUTH_USER_UUID` with the retained HPCC Auth user UUID before running in the HPCC SQL Editor. All Auth users and existing Storage files are preserved. The retained account receives the Super Admin role. Existing Poppies/interschool/audit/webhook tables are removed; those additional features are not part of this clone.

HPCC membership options start inactive pending confirmation of HPCC fees. Payment accounts are empty. Email and payment providers require HPCC credentials and configuration. No provider secrets are included. Configure only this HPCC Supabase project: `nrnlbgwgfknwpwpuhwri`.

## Vercel

Import this repository into team hpcc2. Configure environment variables from `.env.example` using HPCC credentials. Set both public Supabase key variables to the HPCC publishable key. Store the HPCC Supabase service role/secret key only as `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to the preview deployment before configuring callbacks. Keep the existing live domain until the replacement is reviewed.

## Checks

`npm ci`, `npx tsc --noEmit`, `node --test tests/*.test.cjs`, `npm run build`.

## Release status

This release contains deployable code and isolated fixture tests. Production SQL/provider status must be verified separately. No actual bank details, member payment tests, refunds, deletions or bulk sends are part of validation.
