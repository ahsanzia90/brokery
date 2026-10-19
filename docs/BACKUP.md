# Backups and recovery

## What to back up

1. **PostgreSQL** — everything: users, businesses, listings, prices + history, RFQs, audit logs.
2. **Object storage** — public bucket (images) and private bucket (verification documents).
3. **Environment configuration** — the `.env` values held by your hosting provider (store in a
   password manager, never in git).

## PostgreSQL

Managed providers (Neon, Supabase, RDS) have point-in-time recovery; enable it with at least
7 days retention. For self-hosted:

```bash
# nightly logical dump (cron)
pg_dump "$DATABASE_URL" --format=custom --file=/backups/mandilink-$(date +%F).dump
# keep 30 days
find /backups -name 'mandilink-*.dump' -mtime +30 -delete
```

Restore:

```bash
createdb mandilink_restore
pg_restore --no-owner --dbname=mandilink_restore /backups/mandilink-2026-10-19.dump
```

Test a restore quarterly and record the result.

## Object storage

- S3/R2: enable bucket versioning and a lifecycle rule that keeps deleted versions ≥ 30 days.
- Local disk (`STORAGE_PROVIDER=local`): include `storage/` in the same nightly snapshot as the
  database, e.g. `tar -czf /backups/storage-$(date +%F).tgz storage/`.

## Recovery plan (summary)

| Scenario | Action |
| --- | --- |
| Bad deploy | Roll back to the previous build; migrations are additive so the old build keeps working. |
| Accidental admin change | Use **Admin → Audit logs** (before/after values) to reverse it. Price corrections are versioned in `price_history`. |
| Data loss | Restore the latest dump to a new database, point `DATABASE_URL` at it, redeploy. |
| Storage loss | Restore bucket versions / snapshot; listing rows reference paths, so images reappear. |
| Secret leak | Rotate `AUTH_SECRET` (invalidates all sessions and pending OTPs), provider tokens, `CRON_SECRET`. |

Document the responsible person and run the plan once before launch.
