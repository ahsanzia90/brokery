# Architecture

## Request flow

```
Browser ──► Next.js (App Router)
             ├─ Server Components: read via src/lib/data/* and module queries (Drizzle)
             ├─ Server Actions: validate (zod) → authorize → service function → audit/notify/track
             ├─ Route handlers: /api/search/suggest, /api/uploads/*, /api/taxonomy/*, /api/events, /api/cron, /files/*
             └─ Middleware: current path header, anonymous analytics id, noindex for private areas
PostgreSQL ◄─ Drizzle ORM (src/db), migrations in ./drizzle
Storage    ◄─ src/lib/storage (local | s3): public bucket (images) / private bucket (documents)
```

Services are plain functions that take an explicit actor (user id / business) so they can be
tested without cookies; server actions are thin wrappers that resolve the session and call them.

## Modules

| Module | Code | Notes |
| --- | --- | --- |
| Identity & access | `src/lib/auth`, `src/lib/authz`, `profiles`, `user_roles`, `sessions`, `otp_challenges` | OTP + sessions, RBAC |
| Businesses | `src/lib/business`, `businesses`, `business_members`, `business_commodities`, `business_verifications`, `business_documents` | Verification levels, consent flags |
| Taxonomy | `src/lib/data/taxonomy.ts`, `src/lib/admin/taxonomy-service.ts`, `categories` → `commodities` → `commodity_varieties` → `commodity_grades`, `commodity_aliases`, `attribute_definitions`, `category_attributes`, `units`, `category_units`, `locations`, `taxonomy_requests` | Database-driven; renames keep ids; slugs changes create redirects |
| Listings | `src/lib/listings`, `listings`, `listing_attributes`, `listing_images`, `listing_documents`, `listing_status_history`, `listing_reports` | Moderation levels auto/review/restricted/prohibited; normalized kg only when conversion is valid |
| Search | `/api/search/suggest`, `src/lib/data/listings.ts`, `search_logs` | `tsvector` on listings, trigram on names/aliases, popular searches from real logs |
| Prices | `src/lib/prices`, `market_prices`, `price_history`, `price_sources`, `price_import_jobs` | One published row per key; supersede + change %; immutable history; stale labelling |
| RFQs | `src/lib/rfq`, `rfqs`, `rfq_attributes`, `rfq_recipients`, `supplier_quotes`, `enquiry_events` | Matching by commodity (+city), direct enquiries, quote states |
| Favorites / reports / contact | `src/lib/favorites`, `src/lib/reports`, `src/lib/contact` | Contact reveal is consent-gated and tracked |
| Platform | `notifications`, `content_pages`, `seo_metadata`, `redirects`, `admin_audit_logs`, `site_settings`, `support_cases`, `feature_flags`, `analytics_events`, `homepage_sections`, `rate_limits` | |
| Admin | `src/app/admin/**`, `src/lib/admin/*` | Separate layout, permission-filtered nav, audit on every write |

## Units and quantities

`units.base_factor` converts to the base unit of its type (kg, litre, piece, m, m²). Packages
without a fixed weight (bag, sack, drum, carton) have no factor and are never normalized.
`maund` is special-cased: the kg value comes from `site_settings.units.maund_kg` (default 40)
because it varies by market. Listings store the original quantity + unit and `quantity_kg`
only when the conversion is valid. Price sorting only compares listings that share a price unit.

## Localization

- UI strings: `src/lib/i18n/messages/{en,ur}.json`, cookie `ml_lang`, `<html lang dir>` set
  per request; Urdu uses the system Nastaliq/Naskh font stack with logical CSS properties.
- Data: `name_en` / `name_ur` columns and `commodity_aliases` (en, ur, ur_roman) feed search and
  display. Admins add regional terms without code changes.
- Add UI keys with `npx tsx scripts/i18n-add.ts snippet.json`.

## SEO

- Public pages are server-rendered with `buildMetadata()` (title template, description,
  canonical, robots, Open Graph) and admin overrides from `seo_metadata` (by path or entity).
- Indexable: home, categories, commodities, varieties/city pages **only when they have
  listings or prices**, listings, supplier directory + profiles, prices, markets, guides, static
  pages. Private and transactional pages are `noindex`.
- `sitemap.xml` and `robots.txt` are generated from the database with the same rules;
  `redirects` are applied from the 404 handler; slug changes create redirects automatically.
- JSON-LD: Organization + WebSite(SearchAction) site-wide, BreadcrumbList on hierarchies,
  Article on guides, Product/Offer only for fixed-price listings, LocalBusiness only when a
  supplier has consented public contact details. No ratings/reviews markup.

## Caching

`unstable_cache` with tags (`taxonomy`, `locations`, `settings`) for reference data; admin
writes call `src/lib/admin/cache.ts` to revalidate. Listing and price pages are dynamic.

## Analytics

`track()` writes privacy-conscious rows to `analytics_events` (no IP/UA; bot flag). The admin
dashboard derives metrics from these rows and the core tables (never from hard-coded numbers).
