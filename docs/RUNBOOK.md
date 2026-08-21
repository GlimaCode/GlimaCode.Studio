# Runbook

Operational procedures for glimacode.com. Written on the assumption that the
studio may need to move host or database provider at short notice, and that
whoever is doing it may be tired and in a hurry.

Every section is written. If one goes stale, fix it here rather than
remembering the correction.

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

## Database backup and restore

### What actually needs backing up

The schema does not. It is `db/migrations`, in the repository, applied in
filename order. Restoring a schema dump on top of those migrations gives you
two sources of truth that will disagree eventually.

What needs backing up is the data, and it is small: portfolio content, the
requests table, the delivery log, and the team roster. All of it fits in a
file you can read.

One thing is **not** in the database at all in a portable form: the accounts.
Authentication lives in the provider's `auth` schema, and `team_members.user_id`
points at it. See *After a restore into a different project* below — getting
this wrong is the difference between a working dashboard and one that signs
you in and then tells you that you are not on the team.

### Check what the provider already does

Before writing your own procedure, find out what the plan includes. Supabase
takes daily backups on paid plans and **none** on the free plan. Look under
Database → Backups. If that page is empty, the only backups that exist are
the ones you take.

### Taking a backup

Requires the database password, which is in the project's connection settings
and is not in this repository.

```
pg_dump "<connection string>" --data-only --schema=public   --exclude-table=schema_migrations   -f glimacode-data-YYYY-MM-DD.sql
```

`--data-only` and `--schema=public` are both load-bearing. Without the first
you get a schema that competes with the migrations; without the second you
drag in the provider's internal schemas, which will not exist the same way
anywhere else.

Keep the file somewhere that is not the same provider. A backup that dies with
the thing it was backing up is a ritual, not a backup.

### Restoring

1. Stand up Postgres and apply `db/migrations` in filename order.
2. Load the data dump with `psql "<connection string>" -f <file>`.
3. Fix the roster (below) if this is a different project.
4. Run `db/verify/rls_probe.sql` in the SQL editor.

Step 4 is not optional and it is the reason the probe exists. Grants and
policies are created by the migrations, but a restore is exactly the moment
when a step gets skipped and nobody notices — and the failure mode is silent:
the site works perfectly while every client brief is readable by the public.
The probe answers that question in eighteen lines of output.

### After a restore into a different project

Accounts do not travel. A new project has a new `auth` schema, so:

1. Create the two team accounts by hand, as originally done. Public signup
   stays off; there is no self-service path and there should not be.
2. Read the new user ids from the provider's auth dashboard.
3. Update the roster to match:

   ```sql
   update public.team_members set user_id = '<new uuid>' where name = 'Ali';
   update public.team_members set user_id = '<new uuid>' where name = 'Mostafa';
   ```

4. Sign in and confirm the request list loads. If it says you are not on the
   team roster, step 3 is wrong — the account is real, it is just pointing at
   an id that no longer exists.

Requests keep their ticket references across a restore. They are stored on the
row, not derived, so a reference quoted in an email six months ago still finds
the right record.

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

### How to tell

The dashboard says so, on the list, without being asked. A request with no
successful delivery carries a **not notified** flag, and a banner at the top
counts them: *"1 request with no recorded delivery. Nobody was emailed about
it — they are only here."*

That wording is deliberate and worth keeping. The failure mode this design
exists to prevent is a brief that arrives, is never emailed, and sits in a
list nobody thought to check.

### What it means

Nothing was lost. The API route persists the request first and notifies
second, and the notification is not allowed to fail the response — a visitor
who saw a confirmation and a ticket reference really is in the database.

An absent delivery record reads as *not delivered*. That is intentional: the
log is written after the send attempt, so an attempt that died before it could
log looks identical to one that never ran, and operationally both mean the
same thing.

### While no provider is configured

With `MAIL_PROVIDER=none`, every request is flagged. This is the correct
display of the true state, not a bug — nobody is being emailed, because there
is nowhere to email from yet. Triage from the dashboard until the mailbox
exists.

### Turning delivery on

Set three environment variables in the hosting project — `MAIL_PROVIDER`,
`MAIL_FROM`, `MAIL_TO`, plus `MAIL_API_KEY` — and redeploy. No code changes:
`src/lib/mail/` is written against a provider-agnostic interface for exactly
this. Then submit a real request and confirm the flag does not appear.

### When a send fails with a provider configured

1. Open the request. The detail view shows every delivery attempt with its
   provider and error text — that is usually the whole diagnosis.
2. Reply by hand from the detail view. The visitor is waiting on a person,
   not on the pipeline.
3. Common causes: an expired API key, a sending domain that has lost its
   DNS verification, or a recipient address that no longer exists.

Attempts are append-only. Nothing overwrites the record of a failure, so the
history of a bad week stays legible after it is fixed.

## Contacts

Studio address: `glimacode.studio@gmail.com`. A domain mailbox at
`hello@glimacode.com` is planned; when it exists, changing
`src/config/site.ts` is the only code change required.
