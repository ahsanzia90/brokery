# Deployment

## 1. Environments

Use at least two: **development** (local PostgreSQL, `OTP_PROVIDER=console`, local storage)
and **production** (managed PostgreSQL, real SMS provider, S3-compatible storage, HTTPS).
Never point development at the production database. The dev sample seed refuses to run against
non-local hosts.

## 2. Provision

1. **PostgreSQL 14+** (Neon, Supabase, RDS, DigitalOcean, self-hosted). Extensions `pg_trgm`
   and `unaccent` must be allowed (they are created by migration `0001`).
2. **Object storage** (optional but recommended): two buckets, one public (listing images, logos,
   category images) and one private (verification documents). Any S3-compatible API works
   (AWS S3, Cloudflare R2, MinIO, Supabase Storage S3 endpoint).
3. **SMS provider** for OTP: Twilio (`OTP_PROVIDER=twilio`) or any HTTP gateway
   (`OTP_PROVIDER=http`, POST JSON `{to, message}` with bearer token). Pakistani gateways
   usually need a registered sender ID/masking; see docs/INTEGRATIONS.md.
4. **Hosting** for Next.js: Vercel, Railway, Render, Fly.io, a VPS with Node 20+ and a reverse
   proxy, or Docker. Node 20.19+ or 22+.

## 3. Configure

Copy `.env.example` and set every value. Minimum for production:

```
DATABASE_URL=postgres://…            (SSL: add DATABASE_SSL=true if your provider requires it)
NEXT_PUBLIC_SITE_URL=https://your-domain.pk
AUTH_SECRET=<openssl rand -hex 32>
OTP_PROVIDER=twilio | http            (+ provider credentials)
STORAGE_PROVIDER=s3                   (+ S3_* variables)       or local with a persistent disk
CRON_SECRET=<openssl rand -hex 24>
NODE_ENV=production
```

Secrets live only in the hosting provider's environment settings. The browser bundle only
receives `NEXT_PUBLIC_*` variables.

## 4. Build and migrate

```bash
npm ci
npm run db:migrate          # safe to run on every deploy; migrations are additive
npm run db:seed             # idempotent; adds missing taxonomy/content, never overwrites admin edits
npm run build
npm run start               # or your platform's start command
```

Create the first super admin once:

```bash
npm run admin:create -- --phone +92XXXXXXXXXX --name "Your Name"
```

Then sign in at `/login` with that number (OTP via your SMS provider).

### Docker (example)

```Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh","-c","npm run db:migrate && npm run start"]
```

Mount a persistent volume at `/app/storage` if you use `STORAGE_PROVIDER=local`.

## 5. Scheduled maintenance

Call `POST /api/cron` every 10–15 minutes with `Authorization: Bearer $CRON_SECRET`. It
expires listings, RFQs and quotes, hard-expires very old published prices, publishes scheduled
content, delivers queued SMS/email notifications and prunes rate-limit rows.

- Vercel: `vercel.json` → `{"crons":[{"path":"/api/cron","schedule":"*/15 * * * *"}]}` and
  configure the header via a proxy route, or use an external scheduler.
- Anywhere: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain.pk/api/cron`.

## 6. After go-live checklist

- [ ] `https://` enforced by the host; `NEXT_PUBLIC_SITE_URL` matches the canonical domain.
- [ ] `/robots.txt` and `/sitemap.xml` return 200; submit the sitemap in Google Search Console
      (set `GOOGLE_SITE_VERIFICATION` to render the verification meta tag).
- [ ] Admin → Settings: brand name, contact details, stale-price days, listing expiry, maund kg.
- [ ] Admin → Market prices → Sources: add your real sources before publishing rates.
- [ ] Backups scheduled (docs/BACKUP.md).
- [ ] Error reporting: set `SENTRY_DSN` and wire your preferred SDK (boundary only; see INTEGRATIONS).
- [ ] Review the privacy policy and terms pages (Admin → Content) for your legal entity.

## 7. Upgrading

1. Pull changes, `npm ci`.
2. `npm run db:migrate` (never edit applied migration files; add new ones with `npm run db:generate`).
3. `npm run build && npm run start`.
