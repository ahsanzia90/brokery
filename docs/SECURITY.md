# Security

## Principles

- Authorization is enforced **on the server** (server actions, route handlers, page guards).
  Hiding a button never grants or removes access.
- Users never see another user's private data: phone numbers only with explicit consent
  flags, documents only through the authenticated `/files/private` route, RFQ details only to
  the buyer who created them and the suppliers matched to them.
- Nothing fabricated: no fake prices, badges, reviews or statistics anywhere.

## Authentication

- Phone-number login with a 6-digit one-time code generated with `crypto.randomInt`.
- Only an HMAC-SHA256 of `(phone, code)` keyed with `AUTH_SECRET` is stored. Codes expire after
  `OTP_CODE_TTL_SECONDS` (default 5 min), allow `OTP_MAX_ATTEMPTS` (default 5) guesses, and
  resends respect a cooldown. Comparison is constant-time.
- Rate limits are stored in PostgreSQL (`rate_limits`) so they hold across instances:
  5 requests / 15 min per phone, 20 / hour per IP hash.
- Sessions are random 256-bit tokens; only a SHA-256 hash is stored. Cookie is `httpOnly`,
  `SameSite=Lax`, `Secure` in production, 30 days by default; revocation per session or all.
- IPs are stored only as keyed hashes. The `console` OTP provider cannot run in production.
- Admin accounts use the same OTP flow; roles are granted by a super admin or the
  `admin:create` script, never by self-service.

## Authorization

- `src/lib/authz/permissions.ts` maps roles to fine-grained permissions
  (`listings.moderate`, `prices.publish`, `roles.manage`, …).
- Pages: `requireUserPage`, `requireAdminPage(permission)`. Actions: `requireUser`,
  `requirePermission`, `requireSuperAdmin` (role changes, destructive merges, payment flags).
- Ownership checks: listing writes verify business membership; RFQ reads/writes verify the
  buyer; quotes verify the responding business is a recipient.
- All admin writes produce `admin_audit_logs` rows (actor, action, entity, before/after,
  reason). Sensitive fields (document paths, phone, email, hashes) are redacted in logs.

## Input and output

- Every form is validated with zod on the server; user text is trimmed, length-limited and
  stripped of HTML. Markdown from admins is rendered by a small allow-list renderer without raw
  HTML passthrough. React escapes all output; JSON-LD is serialized with `<` escaped.
- Uploads: MIME + magic-byte checks; images are re-encoded with sharp (EXIF/GPS removed,
  max 1600px, WebP); documents are size-limited and stored in the private bucket; storage keys
  are random and path-traversal safe.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`; private areas send `X-Robots-Tag: noindex`.
- Server actions are same-origin by Next.js design (origin check), and the cookie is `SameSite=Lax`.
- Secrets only in environment variables; the browser receives only `NEXT_PUBLIC_*` values.

## Abuse controls

- Rate limits on OTP, listing creation, RFQ creation, contact reveals, uploads, reports and
  contact forms (per user or anonymous id).
- Honeypot fields on guest forms. Bot user agents are flagged in analytics.
- Reports and support cases feed a moderation queue; suspension revokes sessions and pauses
  listings; prohibited/restricted categories require documents and review.

## Privacy

- Consent records (`user_consents`) for terms, privacy, contact sharing.
- Contact details are shown only when the business enabled public sharing (and per listing).
- Document retention dates and soft deletion with storage removal after approval.
- Account deactivation hides activity immediately and opens a data-deletion case; sign-in within
  the retention window restores it.
- Analytics never store raw IP or user agent; anonymous ids are random cookies.

## Operational

- Rotate `AUTH_SECRET` to invalidate all sessions/OTPs at once.
- Keep PostgreSQL and object storage private-network only; enforce TLS.
- Review `/admin/audit` regularly; alerts can be built on `analytics_events` and `support_cases`.
- Report vulnerabilities to the contact address configured in Admin → Settings.
