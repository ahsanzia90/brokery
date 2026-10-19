# Integrations and their current status

Every external integration is behind a provider boundary. When a provider is not configured the
application says so (e.g. notification rows are marked `skipped: provider_not_configured`)
instead of pretending a message was sent.

| Integration | Boundary | Status without credentials | How to enable |
| --- | --- | --- | --- |
| SMS / OTP | `src/lib/auth/providers` (`console`, `twilio`, `http`) | `console` prints codes in dev; production refuses to start the flow and shows "SMS delivery is not configured" | Set `OTP_PROVIDER=twilio` + `TWILIO_*`, or `OTP_PROVIDER=http` + `SMS_HTTP_ENDPOINT`/`SMS_HTTP_TOKEN` for a local gateway (POST JSON `{to, message}`) |
| Transactional email | `src/lib/notifications/email.ts` | Rows recorded as skipped | `EMAIL_PROVIDER=smtp`, `SMTP_*`, and `npm install nodemailer` (loaded dynamically) |
| WhatsApp Business | `src/lib/notifications` (channel `whatsapp`) | Rows recorded as `failed: whatsapp_provider_not_implemented` | Implement `sendWhatsApp()` against the Cloud API using `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` and flip `whatsapp_notifications` feature flag. Template approval from Meta is required. |
| Object storage | `src/lib/storage` (`local`, `s3`) | Local disk under `STORAGE_LOCAL_ROOT` | `STORAGE_PROVIDER=s3` + `S3_*` (AWS S3, R2, MinIO, Supabase Storage) |
| Web analytics | `src/lib/analytics/track.ts` + `/api/events` | Events stored in `analytics_events` only | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` and add the GA snippet in `src/app/layout.tsx` behind the consent notice; or forward events from the table |
| Error reporting | — | Server errors logged to stdout | Set `SENTRY_DSN` and install `@sentry/nextjs` following its wizard |
| Google Search Console | `GOOGLE_SITE_VERIFICATION` meta tag | — | Add the token, submit `/sitemap.xml` |
| Price data feeds | `src/lib/prices` CSV import + `price_sources` | Manual entry and CSV import | A scheduled import can call `importPricesCsv()` with data from an **authorized** source. Do not scrape sites that forbid it. |
| Payments / subscriptions | `feature_flags.payments`, `site_settings.payments.*` | Disabled; no payment UI exists | Future: add a `src/lib/payments` module for an approved Pakistani provider and only then enable the flag |
| Voice search | `feature_flags.voice_search` | Disabled | Future enhancement |

## Notification flow

1. Services call `notify()` → an in-app row is always written.
2. For each external channel the user opted into, a row is written as `pending` (provider
   configured) or `skipped` (not configured).
3. `POST /api/cron` delivers `pending` rows and records `sent`/`failed` with the error.
4. Users can see delivery status on `/notifications`.
