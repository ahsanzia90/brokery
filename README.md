# MandiLink — Pakistan Commodity Market

A free B2B commodity marketplace for Pakistan. Buyers find commodities, check published
market rates and contact suppliers. Sellers list their maal and receive enquiries. Admins run
the marketplace (taxonomy, moderation, prices, verification, content, SEO) without code changes.

> **Know the market. Find the supplier. Make the deal.**
> No commission, no online payments, no escrow in this phase. Deals happen directly between parties.

The brand name is configurable: `NEXT_PUBLIC_BRAND_NAME` at build time, or **Admin → Settings → brand.name** at runtime.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router, React 19, TypeScript) | Server rendering for SEO, server actions for forms, one deployable |
| Styling | Tailwind CSS v4 + design tokens in `src/app/globals.css` | Small CSS, consistent spacing/contrast, RTL via logical properties |
| Database | PostgreSQL 14+ via Drizzle ORM + SQL migrations | Relational integrity, full-text + trigram search without extra services |
| Auth | Phone OTP, server-side sessions (httpOnly cookie), pluggable SMS providers | Pakistan-first, no passwords; OTP codes are HMAC-hashed, rate-limited, attempt-limited |
| Storage | Local filesystem (dev) or any S3-compatible bucket; private bucket for documents | Private documents are only served through an authenticated route |
| Search | PostgreSQL `tsvector` + `pg_trgm` over names and Roman-Urdu/Urdu aliases | Typo-tolerant, multilingual, no search cluster |
| Tests | Vitest unit + integration (real PostgreSQL) | Verifies security rules against the actual database |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to go live.

## Quick start (development)

```bash
# 1. PostgreSQL 14+ running locally, then:
createdb mandilink
cp .env.example .env.local        # edit DATABASE_URL and AUTH_SECRET (openssl rand -hex 32)

npm install
npm run db:migrate                # applies ./drizzle/*.sql
npm run db:seed                   # taxonomy, locations, units, attributes, system pages, settings
npm run db:seed:dev               # OPTIONAL, dev only: clearly labelled sample users/listings/prices
npm run admin:create -- --phone +923001234567 --name "Ops Admin"   # grants super_admin
npm run dev                       # http://localhost:3000
```

Sign in at `/login` with the phone number. With `OTP_PROVIDER=console` (the development
default) the one-time code is printed in the terminal running `npm run dev`. The console
provider refuses to run in production.

Dev sample accounts (only after `db:seed:dev`): `+923000000001` super admin + seller,
`+923000000002` seller, `+923000000003` buyer. Sample prices are labelled
"Development sample (not real data)".

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:generate` | Generate a new SQL migration from `src/db/schema` |
| `npm run db:migrate` | Apply migrations (`./drizzle`) |
| `npm run db:seed` | Idempotent seed: taxonomy, locations, units, attributes, content, settings |
| `npm run db:seed:dev` | Development-only sample data (refuses on non-local databases) |
| `npm run admin:create -- --phone +92… [--role super_admin]` | Grant an admin role |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit + integration; integration uses `TEST_DATABASE_URL`) |
| `npm run lint` | ESLint |

## Project layout

```
drizzle/                 SQL migrations (+ meta)
scripts/                 migrate, create-admin, dev-session (dev only), i18n-add
src/app/                 routes (public site, dashboards, /admin, /api)
src/components/          ui primitives, layout, marketplace cards, seller/rfq/admin widgets
src/db/schema/           Drizzle schema (identity, taxonomy, marketplace, prices, rfq, platform)
src/db/seed/             seed data + runner
src/lib/                 auth, authz, i18n, storage, notifications, analytics, seo, data access, services
tests/                   vitest unit + integration
docs/                    architecture, deployment, security, integrations, backups
```

## Key behaviours

- **Guests** can browse, search, read prices, view suppliers and start an enquiry; sign-in is
  asked for only when submitting or managing something.
- **Buyer / seller** are capabilities of one account; switch from the dashboard.
- **Listings** go through moderation by default (`listings.require_moderation`), categories can
  be `auto`, `review`, `restricted` (documents + review) or `prohibited`.
- **Prices** always carry type, unit, observation date, source and status. Stale rates are
  labelled and excluded from "today's rates". Nothing is ever invented.
- **Verification labels** state exactly what was checked: not verified, phone verified,
  business documents reviewed, admin verified.
- **Admin** is a separate protected area at `/admin` with server-side RBAC
  (`src/lib/authz/permissions.ts`) and an audit log for every write.
- **Localization**: English and Urdu (RTL) dictionaries in `src/lib/i18n/messages`, localized
  taxonomy names and Roman-Urdu search aliases in the database.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, data model, permissions, search, SEO
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — environments, hosting, cron, environment variables
- [docs/SECURITY.md](docs/SECURITY.md) — threat model and controls
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — SMS/OTP, email, WhatsApp, storage, analytics, payments (future)
- [docs/BACKUP.md](docs/BACKUP.md) — backups and recovery
- [docs/STATUS.md](docs/STATUS.md) — what is complete, what is not, known limitations
