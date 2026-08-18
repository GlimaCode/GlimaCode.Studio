# Migrations

Plain SQL, applied in filename order. Numbered `NNN_description.sql`.

The schema lives here rather than only in a provider dashboard so the
database can be rebuilt from source on any Postgres instance. Nothing in
this directory should depend on extensions a stock Postgres lacks.

Where provider-specific behaviour is unavoidable — reading the authenticated
user out of a request, for example — it is wrapped in a single function so a
move means rewriting that function rather than every policy.

## Applying

Paste a migration into the SQL editor of the hosting provider, or pipe it to
`psql` against the connection string:

```
psql "$DATABASE_URL" -f db/migrations/001_example.sql
```

## Rules

- Migrations are append-only. Fix a mistake with a new migration.
- Every table gets row-level security enabled in the same migration that
  creates it.
- No real business data in seed files. Sample data only.
