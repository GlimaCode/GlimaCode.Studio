# Runbook

Operational procedures for glimacode.com. Written on the assumption that the
studio may need to move host or database provider at short notice, and that
whoever is doing it may be tired and in a hurry.

Sections marked **pending** are filled in as the corresponding phase lands.

## Where things live

| Thing | Where | Who has access |
|---|---|---|
| Source | `github.com/GlimaCode/GlimaCode.Studio` | Both, as organisation owners |
| Hosting | Vercel | Both |
| Database | Supabase | Both |
| Domain registrar | parsvds.com | Ali |
| DNS records | Vercel dashboard — nameservers are delegated from the registrar | Both |
| Brand assets | `public/brand/` in this repository | Both |

Nothing operationally important should exist only in a provider dashboard.
Schema lives in `db/migrations`, configuration lives in `src/config/site.ts`,
and this file records the rest.

## Redeploy from scratch

Assumes the repository is intact and you have a fresh hosting account.

1. Create a new project on the host and point it at `GlimaCode/GlimaCode.Studio`.
   Framework preset: Next.js. Build command and output directory: defaults.
2. Set the environment variables from `.env.example` in the project settings.
   Values come from the database project's API settings.
3. Trigger a deploy. Confirm the build passes and the site answers on the
   host's preview domain before touching DNS.
4. Attach the domain, then follow **DNS** below.

The site has no build-time dependency on the database: public pages render
without credentials, so a deploy will succeed even if the database is down.

## DNS

Nameservers for `glimacode.com` are delegated from parsvds.com to Vercel, so
records are managed in the Vercel dashboard, not at the registrar.

- To repoint the site, change the record in the Vercel dashboard.
- To leave Vercel entirely, change the nameservers back at parsvds.com first,
  then recreate the records wherever they are going. Expect propagation to
  take up to 24 hours; lower the TTL a day in advance if the move is planned.
- The registrar login is the root of trust for the domain. If access to it is
  ever lost, everything else is replaceable but this is not — keep the
  credentials in a password manager both of you can reach.

## Database restore

**Pending — written in phase 4, once there is data worth restoring.**

Will cover: taking a backup, where backups are kept, restoring into a fresh
Postgres instance from `db/migrations` plus a data dump, and verifying
row-level security survived the restore.

## Rotating the anonymous key

**Do this once phase 4 is complete.** The key is public by design — it ships
to every browser, and row-level security is what actually protects the data,
so a copy of it in a chat log or a document is not a breach. Rotate anyway:
it was handled outside the deployment during development, and starting
production life with a key that only ever existed in the hosting dashboard
is the cleaner position.

Rotation invalidates more than the anonymous key. On projects using the
original key scheme both keys are signed with the same project JWT secret,
so regenerating it also invalidates `service_role` and signs out every
authenticated session, both of you included. On projects using separate
publishable and secret keys, they rotate independently. Check which scheme
the project uses before starting, because it decides how much goes down.

Order matters — do it in one sitting:

1. Announce it. Anyone signed in to the dashboard will be signed out.
2. Regenerate the key in the database project's API settings.
3. Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the hosting project settings
   for **both** the production and preview environments. A preview
   environment left on the old key fails in a way that looks unrelated.
4. Redeploy. Environment variables are read at build time, so an existing
   deployment keeps using the old value until it is rebuilt.
5. If the secret key rotated too, update it everywhere it is set.
6. Verify: load a public page signed out, submit a test request, then sign
   in to the dashboard and confirm the request appears.
7. Update `.env.local` on both machines.

If step 6 fails, the previous deployment can be rolled back in the hosting
dashboard, but it will be running against a key that no longer exists — the
fix is forward, by correcting the variable and redeploying.

## Moving to another database provider

The application imports the provider SDK in exactly one module,
`src/lib/db/client.ts`, and every query goes through a repository in
`src/lib/data`. The schema is plain SQL in `db/migrations` and avoids
provider-specific extensions.

1. Stand up Postgres on the new provider.
2. Apply `db/migrations` in filename order.
3. Restore the data dump.
4. Rewrite `src/lib/db/client.ts` against the new client library, and the
   authentication wrapper in `src/lib/auth` if the provider handles auth.
5. Update the environment variables. Nothing above the data layer changes.

The one place provider-specific behaviour reaches into the schema is the
function that resolves the current authenticated user inside row-level
security policies. It is defined once and referenced by every policy, so a
move rewrites one function rather than every policy.

## Notification failures

**Pending — written in phase 3, with the notification pipeline.**

## Contacts

Studio address: `glimacode.studio@gmail.com`. A domain mailbox at
`hello@glimacode.com` is planned; when it exists, changing
`src/config/site.ts` is the only code change required.
