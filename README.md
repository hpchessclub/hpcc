# Howick-Pakuranga Chess Club

Independent Next.js / TypeScript / Tailwind / Supabase application based on AKCC commit 30cd5fd55fea54f65622fe71ba44a23abef7f7fc (10 October 2026). No AKCC credentials or records are included.

## Database rebuild

`supabase/hpcc_rebuild.sql` deletes HPCC application tables and recreates the application schema in one transaction. Replace `REPLACE_WITH_HPCC_AUTH_USER_UUID` with the retained HPCC Auth user UUID before running in the HPCC SQL Editor. All Auth users and existing Storage files are preserved. The retained account receives the Super Admin role. Existing Poppies/interschool/audit/webhook tables are removed; those additional features are not part of this clone.

HPCC membership options start inactive pending confirmation of HPCC fees. Payment accounts are empty. Email and payment providers require HPCC credentials and configuration. No provider secrets are included. Configure only this HPCC Supabase project: `nrnlbgwgfknwpwpuhwri`.

## Vercel

Import this repository into team hpcc2. Configure environment variables from `.env.example` using HPCC credentials. Set both public Supabase key variables to the HPCC publishable key. Store the HPCC Supabase service role/secret key only as `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to the preview deployment before configuring callbacks. Keep the existing live domain until the replacement is reviewed.

## Checks

`npm ci`, `npx tsc --noEmit`, `node --test tests/*.test.cjs`, `npm run build`.

## Release status

Source prepared; database reset not executed; Vercel not deployed; real email, payment processing and NZ Post lookup not configured or tested. Validate registration and admin flows against HPCC before launch.
