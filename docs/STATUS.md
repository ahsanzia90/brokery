# Build status — MandiLink / Pakistan Commodity Market

Last verified: 2026-10-19 against PostgreSQL 16 and Node 22, production build (`next build`).

## Completed

| Area | What works |
| --- | --- |
| Homepage | "Aap kya karna chahte hain?" hero with equal Buy / Sell actions, commodity search with autocomplete (English, Urdu, Roman Urdu aliases), popular categories, today's rates (fresh only, with source and date), recent listings, verified suppliers (only when real data exists), how it works, browse by category, browse by city, guides, footer. Sections are toggled/ordered from Admin → Content → Homepage. Empty states, never fabricated content. |
| Localization | English and Urdu dictionaries (861 keys), persistent switcher (cookie), full RTL layout, localized taxonomy names, Roman-Urdu search aliases, PKR formatting, +92 phone normalization, Pakistan provinces/districts/cities/markets seeded. |
| Taxonomy | 36 categories, 328 commodities, 422 varieties, 87 grades, 2,182 aliases, 48 attribute definitions, 25 units, 208 locations — all database-driven and editable in Admin without code changes (verified: new category + commodity + variety created from the service and served at its public URL). Rename keeps ids; slug changes create redirects; merges remap listings/prices/RFQs; "not listed" requests from users go to a review queue. |
| Search | PostgreSQL full-text (listings) + trigram (names/aliases/businesses/locations), typo-tolerant, category-aware filters (only filterable attributes applicable to the commodity), sort options that never compare different price units, recent and popular searches from real logs, zero-result guidance (request from suppliers / report missing commodity). |
| Listings | 6-step mobile wizard (what → quantity/unit → price → location → details/photos/attributes → review & publish), drafts (server + local restore), moderation levels auto/review/restricted/prohibited, document requirement for restricted categories, image re-encoding (EXIF stripped), seller management (edit, pause, resume, sold out, refresh, remove), status history, expiry. |
| Suppliers | Business profiles with precise verification labels (not verified / phone verified / documents reviewed / admin verified), consent-controlled phone/WhatsApp/address display, commodities supplied, directory with city/commodity/verification filters, city pages. |
| Buyer requests (RFQ) | Guest can start; sign-in only on submit (draft kept). Matching to suppliers of the commodity (same city first) or direct enquiry to one supplier. Supplier offers with price/unit/quantity/validity/notes; buyer compares (grouped by unit), accepts for discussion, declines, closes; contact reveal tracked; states as specified. |
| Market prices | Records with type, unit, observation/publication dates, source, low/high, previous and % change, status workflow (draft → review → published → superseded/expired/rejected), one published record per key, immutable version history with corrections and reasons, CSV import with per-row errors, stale labelling and exclusion from "today's rates", public pages by commodity and city (indexable only with data). |
| Accounts | Phone OTP (hashed codes, expiry, attempt and resend limits, DB rate limits), server-side sessions, onboarding (name, language, city, buyer/seller/both, consent), buyer and seller dashboards with switch, favorites, notifications with truthful delivery status, account settings, sign-out everywhere, deactivation with retention case. |
| Admin (`/admin`) | Separate protected app with server-side RBAC (7 admin roles + super admin): dashboard with real metrics, users & roles, supplier verification (private documents, retention, approve/reject/request info), businesses, listing moderation (approve/reject/request edits/hide/feature/flag price/duplicates/image moderation/bulk approve), enquiries (read-only + spam close), reports & cases, taxonomy (categories, commodities, varieties, grades, aliases, attributes, units, locations, requests, merges with impact preview), prices (+ sources + import), content (pages, guides, announcements, homepage sections, footer links), SEO (metadata overrides, snippet preview, redirects, sitemap inspection), settings (brand, contact, languages, listing/price/RFQ rules, maund kg, notification templates), feature flags (payment flags locked, no payment UI), audit logs with before/after, notification monitor. |
| SEO | Server-rendered public pages, unique titles/descriptions, canonical URLs, robots directives, Open Graph image, BreadcrumbList / Article / Product-Offer (fixed-price only) / LocalBusiness (consented only) / Organization / WebSite JSON-LD, dynamic sitemap with "index only when meaningful" rules (414 URLs with seed + sample data), robots.txt, DB-driven redirects, custom 404/500, noindex on private areas and filtered duplicates. |
| Security | See docs/SECURITY.md. Verified: non-admin → `/forbidden`; guest → private document 401; other user → 403; owner → 200; cron requires bearer secret; cross-seller listing edits and cross-buyer RFQ access refused at the service layer. |
| Ops | Migrations (Drizzle SQL), idempotent seed, dev-only sample data with explicit labels, `admin:create`, `/api/cron` maintenance (listing/RFQ/quote/price expiry, scheduled content, document purge, notification delivery), storage providers (local, S3-compatible), docs for deployment, backup, integrations. |

## Acceptance criteria

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Guest searches rice and sees listings | `tests/e2e/public.spec.ts`, `/search?q=chawal` resolves to Rice |
| 2 | Buyer selects commodity, quantity, location and submits an RFQ | `tests/e2e/workflow.spec.ts` step 4 |
| 3 | Seller creates account, creates and manages a listing | `tests/e2e/login.spec.ts` + workflow step 1; service tests for pause/resume/remove |
| 4 | Seller receives and responds to a buyer request | workflow step 5 |
| 5 | Buyer reviews responses and contacts the supplier | workflow step 6 |
| 6 | Admin creates category/varieties without code change | taxonomy fork script: `/commodities/test-commodity` served after creation |
| 7 | Admin approves a listing | workflow step 2 (browser) + admin smoke script |
| 8 | Admin adds a price with source/date/unit/status | prices service script + `/admin/prices/new` |
| 9 | Public site shows published price and labels stale data | `/prices` shows "Older rate" badges and "Rate not available yet" empty state |
| 10 | Seller cannot modify another seller's listing | `tests/integration/ownership.test.ts` |
| 11 | Buyer cannot modify another buyer's request | `tests/integration/ownership.test.ts` |
| 12 | Normal user cannot access admin | e2e + curl: 307 → `/forbidden`; permissions unit tests |
| 13 | Private documents not public | curl: 401 guest / 403 other user / 200 owner |
| 14 | Public pages have titles, metadata, canonical, crawlability | curl checks on `/commodities/rice`, sitemap, robots |
| 15 | Mobile forms work with validation and confirmation | e2e runs on a Pixel 7 profile; no horizontal overflow assertion |
| 16 | Empty DB gives helpful empty states | homepage/prices/listings/suppliers empty states; seed never creates listings/prices |
| 17 | No payment or commission feature active | flags off, settings read-only, no payment routes exist |
| 18 | Migrations, seeds, setup and deployment docs | `drizzle/`, `src/db/seed`, README, docs/DEPLOYMENT.md |

## Test results (2026-10-19)

```
npm run typecheck      → 0 errors
npm run lint           → 0 errors (9 warnings: unused vars / img elements)
npm run test (vitest)  → 6 files, 22 tests passed (unit + integration on a real database)
npm run test:e2e       → 12 tests passed (login via OTP in dev; public + full workflow against the production build)
next build             → success (96 page routes, 15 API routes)
```

## Not yet operational (needs credentials or a decision)

- **SMS delivery**: `console` provider only in development. Production needs `OTP_PROVIDER=twilio` or an HTTP gateway (`docs/INTEGRATIONS.md`). Until then the login page states that SMS is not configured.
- **Email**: boundary exists (`EMAIL_PROVIDER=smtp` + nodemailer) — not installed by default.
- **WhatsApp Business notifications**: channel and consent exist; API sender not implemented (needs Meta approval and templates).
- **Web analytics / error reporting**: events are stored in the database; forwarding to GA/Sentry requires their keys and snippet.
- **Price feeds**: manual entry and CSV import only; no automatic scraping (by design).
- **Payments, subscriptions, featured-listing billing, premium insights, voice search**: feature flags exist and are off; no UI or provider.

## Known limitations

- Admin UI is English only (public site is English + Urdu).
- Price sorting compares only listings that share the most common price unit in the result set; others are listed without a rank.
- `redirect()`/`permanentRedirect()` emit 307/308 rather than the stored 301/302 codes.
- Variety and commodity+city pages are `noindex` until they have listings or prices (intentional).
- Image uploads are stored as WebP ≤1600px; no CDN resizing yet.
- Development sample data (`npm run db:seed:dev`) includes clearly labelled sample prices; run only on local databases.
- The dev database used for verification still contains rows created by the automated tests (titles start with "E2E").

## Suggested next steps

1. Configure an SMS gateway and object storage, deploy (docs/DEPLOYMENT.md), create the first super admin.
2. Add real price sources in Admin → Market prices → Sources and publish the first rates.
3. Review legal pages (privacy, terms, listing policy) with counsel for the operating entity.
4. Translate the admin UI if non-English admins are expected.
