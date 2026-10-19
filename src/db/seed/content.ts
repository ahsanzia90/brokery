export type SeedContentPage = {
  slug: string;
  kind: "page" | "article" | "guide" | "announcement" | "faq";
  titleEn: string;
  titleUr?: string;
  excerptEn?: string;
  bodyEn: string;
  bodyUr?: string;
  isSystem?: boolean;
  status: "draft" | "published";
  relatedCommoditySlugs?: string[];
};

const BRAND = "MandiLink";

export const CONTENT_SEED: SeedContentPage[] = [
  {
    slug: "about",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: `About ${BRAND}`,
    titleUr: "ہمارے بارے میں",
    excerptEn: "A free B2B commodity marketplace for Pakistan.",
    bodyEn: `## Know the market. Find the supplier. Make the deal.

${BRAND} (Pakistan Commodity Market) connects commodity buyers and sellers across Pakistan.

**For buyers:** search for commodities, check published market rates, find suppliers in your city or mandi, and send enquiries or requests for quotation.

**For sellers:** publish what you sell, show available quantities and prices, and receive buyer enquiries directly.

### What we are — and what we are not

- ${BRAND} is a **discovery and enquiry platform**. We help you find each other.
- Negotiation, payment, transport and delivery happen **directly between buyer and seller**.
- There is **no platform commission and no online payment** in this phase. Using ${BRAND} is free.
- Published rates are **indicative** and carry their source and date. They are not offers.
- A verification label means only what we actually checked (see our verification policy).

### Our principles

1. Simple, in Urdu and English, built for phones and slow connections.
2. Honest data: we never invent prices, suppliers, reviews or statistics.
3. Privacy first: your documents and personal contact details are private unless you choose to share them.

If you have questions, visit the contact page.`,
  },
  {
    slug: "how-it-works",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "How it works",
    titleUr: "یہ کیسے کام کرتا ہے",
    excerptEn: "Three simple steps for buyers and for sellers.",
    bodyEn: `## Mujhe maal khareedna hai (I want to buy)

1. **Search the commodity** — by name, local name (chawal, gandum, saria…) or category.
2. **Choose variety, grade and city** — see matching suppliers and the latest published rates.
3. **Contact the supplier or send an enquiry** — by phone, WhatsApp (if the supplier allows) or a request for quotation (RFQ). You only need to sign in when you send an enquiry.

After you submit an RFQ you receive a reference number. Matching suppliers are notified where notifications are configured, and their responses appear in **My Enquiries**, where you can compare price, unit, quantity and validity.

## Mujhe apna maal bechna hai (I want to sell)

1. **Select what you sell** — category, commodity, variety and grade. If your item is not listed, request it.
2. **Add quantity, unit, location and price** — fixed, negotiable, or "ask for quote". Photos help buyers trust the listing.
3. **Sign in and publish** — complete a short business profile. Most listings are reviewed by our team before they appear publicly; you can track the status in **My Listings**.

Buyer enquiries reach you in **My Enquiries**. You respond with your price, unit, quantity and validity, and the buyer can contact you directly.

## What happens after that

The deal — price, quality checks, payment, transport — is between you and the other party. ${BRAND} does not take a commission and does not process payments. Please read the terms of use and verify your counterparty before paying or dispatching goods.`,
  },
  {
    slug: "contact",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Contact and support",
    titleUr: "رابطہ اور مدد",
    excerptEn: "How to reach the team.",
    bodyEn: `## Contact ${BRAND}

Use the support form on this page for questions about your account, listings, enquiries or verification. Contact details configured by the administrator (email, phone, WhatsApp) are shown above the form when available.

### Report a problem

To report a misleading listing, a suspicious supplier, spam or a privacy concern, use the **Report** button on the listing or supplier page. Reports are reviewed by our moderation team.

### Data requests

To request a copy of your data or to delete your account, use **Account settings → Deactivate account**, or submit a support request with the type "Data deletion".`,
  },
  {
    slug: "privacy-policy",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Privacy policy",
    titleUr: "پرائیویسی پالیسی",
    excerptEn: "What we collect, why, and the controls you have.",
    bodyEn: `## Privacy policy

This policy explains what ${BRAND} collects and how it is used. The platform operator's legal name and contact details are configured in site settings and shown in the footer.

### What we collect

- **Account data:** phone number (used to sign in with a one-time code), name, preferred language, city, and optional email.
- **Business profile data:** business name, type, address, public contact numbers you choose to display, description and commodities supplied.
- **Verification documents:** if you request verification, the documents you upload (for example registration certificates). These are stored privately and are visible only to authorised reviewers.
- **Listings and enquiries:** the content you publish or send, including prices, quantities and messages.
- **Usage data:** searches, page views and contact-button clicks, recorded against a random anonymous identifier or your account when signed in. We do not store raw IP addresses in analytics; a one-way hash may be kept briefly for abuse prevention.

### How we use it

- To run the marketplace: show listings, match enquiries to suppliers, send notifications you have enabled.
- To keep the platform safe: rate limiting, spam and fraud prevention, moderation.
- To improve the product: aggregate statistics about searches and categories.

### What is public

- Your **business profile and listings** are public once published.
- Your **phone or WhatsApp number is shown only if you turn that on** in your business profile. Otherwise buyers reach you through enquiries.
- Your personal name, identity documents, registration numbers and private address are **never** published.

### Sharing

We do not sell personal data. Data is shared only with service providers needed to operate the platform (hosting, SMS delivery for one-time codes, email) and when required by law.

### Retention and deletion

You can deactivate your account at any time. Verification documents are deleted after the retention period set by the administrator or on request. Some records (for example moderation and audit logs) may be retained for a limited period for security and legal reasons.

### Your choices

- Control contact visibility and notification channels in **Account settings**.
- Withdraw consent for optional communications at any time.
- Request access to or deletion of your data through the contact page.

### Changes

We will update this page when the policy changes and show the date of the last update.`,
  },
  {
    slug: "terms-of-use",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Terms of use",
    titleUr: "استعمال کی شرائط",
    excerptEn: "The rules for using the marketplace.",
    bodyEn: `## Terms of use

By using ${BRAND} you agree to these terms.

### 1. What the platform does

${BRAND} is a discovery and enquiry service that lets buyers and sellers of commodities find and contact each other. ${BRAND} is **not a party to any transaction**, does not buy or sell goods, does not process payments and does not arrange transport.

### 2. Free service, no commission

In the current phase all core features are free. No commission is charged on any deal and no online payment is collected by the platform. Any future paid features will be clearly announced and optional.

### 3. Your responsibilities

- Provide accurate information in your profile, listings and enquiries.
- Verify the identity, quality, quantity, legality and terms of any deal yourself before paying or dispatching goods. Published rates are indicative only.
- Comply with all applicable laws, including those on regulated goods (chemicals, pesticides, fuels, livestock, hazardous waste) and on taxation.
- Do not post prohibited items (see the prohibited items page), misleading prices, duplicate listings or spam.
- Keep your sign-in phone number secure. You are responsible for activity on your account.

### 4. Content and moderation

We may review, edit, hide or remove listings and profiles that breach these terms or our policies, and may suspend accounts. Where practical we tell you why. You keep ownership of content you post but grant ${BRAND} a licence to display it on the platform.

### 5. Verification labels

Labels such as "Phone verified", "Documents reviewed" and "Admin verified" describe only the check that was performed. They are not a guarantee of a supplier's honesty, solvency or product quality.

### 6. No warranty and limitation of liability

The platform is provided "as is". To the fullest extent permitted by law, ${BRAND} is not liable for any loss arising from a transaction between users, from reliance on published rates, or from interruption of the service.

### 7. Privacy

Our privacy policy explains how data is handled and forms part of these terms.

### 8. Changes

We may update these terms. Continued use after an update means you accept the new terms.`,
  },
  {
    slug: "listing-policy",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Listing policy",
    titleUr: "لسٹنگ پالیسی",
    excerptEn: "What makes a good listing and what gets rejected.",
    bodyEn: `## Listing policy

### A good listing

- One commodity per listing, in the correct category, variety and grade.
- A real available quantity with a clear unit (kg, 40 kg bag, maund, tonne, piece…). If you give a price, say which unit it is per.
- The actual location of the goods.
- Your own photographs of the goods where possible. Stock photos or another seller's photos may be rejected.
- Honest specifications. For rice, for example, broken %, moisture % and crop year if you know them.

### Review

Most listings are reviewed before publication. Reviewers check category, obvious pricing errors, duplicate content, image quality and prohibited items. If your listing is rejected you will see the reason in **My Listings** and can edit and resubmit.

### Expiry and freshness

Listings expire after a set period (shown on the listing) unless you refresh them. Mark listings **sold out** or **paused** when goods are no longer available so buyers are not misled.

### Regulated goods

Chemicals, crop-protection products, fuels, battery scrap and similar items require manufacturer, registration and safety information and are always reviewed. Prohibited items are removed.

### Not allowed

- Listings with fake or placeholder prices intended to attract clicks.
- Duplicate listings of the same goods.
- Contact details or links in the title or photos.
- Goods you do not actually have or are not authorised to sell.`,
  },
  {
    slug: "verification-policy",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Verification policy",
    titleUr: "تصدیق کی پالیسی",
    excerptEn: "What each verification label means.",
    bodyEn: `## Verification policy

${BRAND} uses precise labels so that each one means exactly what was checked.

| Label | What it means |
| --- | --- |
| **Not verified** | No checks beyond account creation. |
| **Phone verified** | The business owner signed in with a one-time code sent to the phone number on the account. |
| **Business documents reviewed** | The business submitted documents (such as a registration certificate, NTN/STRN or trade licence) and a reviewer confirmed they appear genuine and match the business name. |
| **Admin verified** | In addition to document review, an administrator performed further checks (for example a call-back or a reference) and approved the business. |

### What verification is not

Verification does **not** guarantee product quality, delivery, honesty or financial standing. Always do your own due diligence before paying.

### How to get verified

Go to **My Business → Verification**, upload the requested documents and submit. A reviewer will approve, reject or ask for more information, and you will see the result with the reason. Documents are stored privately and never shown publicly.

### Removal

A verification label may be withdrawn if a business is reported and the report is upheld, if documents are found to be invalid, or if the business stops responding to enquiries for a long period.`,
  },
  {
    slug: "prohibited-items",
    kind: "page",
    isSystem: true,
    status: "published",
    titleEn: "Prohibited and restricted items",
    titleUr: "ممنوعہ اور محدود اشیاء",
    excerptEn: "What cannot be listed and what needs extra review.",
    bodyEn: `## Prohibited items

The following may not be listed on ${BRAND}:

- Narcotics, controlled substances and precursor chemicals.
- Weapons, ammunition and explosives.
- Counterfeit, stolen or smuggled goods.
- Endangered species and products made from them.
- Human remains or organs.
- Anything whose sale is illegal in Pakistan.

## Restricted items (always reviewed)

These may be listed only by sellers who hold the required licences and provide the requested documentation:

- Pesticides, herbicides, fungicides and other crop-protection products (registration number required).
- Industrial chemicals, acids, alkalis and solvents (technical grade, concentration and safety data sheet required).
- Petroleum products and industrial fuels (licence details required).
- Lead-acid and other battery scrap and hazardous waste (environmental permissions required).
- Live animals (compliance with provincial livestock rules; health documentation recommended).
- Tobacco.

Reviewers may request additional information or decline a listing. Listings found to breach this page are removed and repeat offenders are suspended.`,
  },
  // ---- Guides -----------------------------------------------------------------
  {
    slug: "how-to-buy-rice-in-pakistan",
    kind: "guide",
    status: "published",
    titleEn: "How to buy rice in bulk in Pakistan",
    titleUr: "پاکستان میں تھوک چاول کیسے خریدیں",
    excerptEn: "Varieties, grades, units and the questions to ask a supplier before you buy.",
    relatedCommoditySlugs: ["rice"],
    bodyEn: `## Know what you are buying

Rice in Pakistan is traded by **variety**, **processing type** and **grade**:

- **Variety:** Basmati types (Super Basmati, 1121, 1509, Kainat, PK-386) are long-grain and aromatic; non-basmati types (IRRI-6, IRRI-9, hybrid) are shorter, cheaper and used for bulk and export markets. Local trade names vary — for example IRRI-9 is often called "Zero 9" in some markets. Confirm the variety name with the supplier.
- **Processing:** raw (white), sella/parboiled, golden sella, steam, brown. Each cooks and prices differently.
- **Grade:** usually expressed as **broken percentage** (2%, 5%, 10%, 25%, 100% broken). Lower broken means more whole grains and a higher price.

## Units

Rice is commonly quoted per **40 kg bag**, per **kg** or per **tonne**. A **maund** is normally 40 kg, but confirm with the mandi. Always ask: "Yeh rate kis unit ka hai?" (Which unit is this rate for?) and compare offers in the same unit.

## Questions to ask a supplier

1. Which variety and crop year?
2. Broken %, moisture % and foreign matter?
3. Is the price per 40 kg bag, per kg or per tonne, and is packaging included?
4. Minimum order quantity and availability date?
5. Where are the goods, and is delivery available or ex-mill / ex-godown?
6. Can I see a sample or a lab report?

## Using ${BRAND}

- Check the **market rates** page for recently published indicative rates and their source and date.
- Search "rice" or "chawal", filter by variety, grade and city, and compare listings.
- If nothing matches, submit a **request for quotation** and let suppliers come to you.
- Prefer suppliers with a verification label, but verify independently before paying.`,
  },
  {
    slug: "understanding-maund-and-units",
    kind: "guide",
    status: "published",
    titleEn: "Understanding maund, bags and other trade units",
    titleUr: "من، بوری اور دیگر تجارتی اکائیاں",
    excerptEn: "Why the same number can mean different quantities, and how to compare offers fairly.",
    bodyEn: `## The maund

In most Pakistani markets one **maund (من)** is **40 kg**. Historical and regional maunds differ, so ${BRAND} treats 40 kg as the default conversion and lets the administrator adjust it. When a rate is quoted "per maund", confirm the kilograms behind it.

## Bags and sacks

A "bag" means nothing until you know its weight. Common standard bags are **40 kg**, **50 kg** and **100 kg**. Cement is usually 50 kg; fertilizer is often 50 kg; rice is often 40 kg. If a seller says "per bag" without a weight, ask. ${BRAND} only converts a quantity to kilograms when the unit has a known, fixed weight; otherwise the quantity is shown exactly as entered.

## Other units you will see

| Unit | Typical use |
| --- | --- |
| kg / metric tonne (MT) | grains, metals, chemicals, scrap |
| 40 / 50 / 100 kg bag | rice, wheat, sugar, cement, fertilizer |
| piece | bricks, machinery, pipes |
| cubic foot (ft³) | sand, crush, timber |
| square foot (ft²) | tiles, marble, glass |
| litre / drum | oils, solvents, fuels |
| bale | cotton, waste paper, hay |
| head | livestock |

## Comparing offers

Convert everything to the same unit before comparing. A rate of Rs. X per 40 kg is not directly comparable with Rs. Y per 50 kg bag or per maund unless you do the arithmetic. On ${BRAND}, listings always show the unit next to the price, and the search results never silently mix units.`,
  },
  {
    slug: "how-to-verify-a-supplier",
    kind: "guide",
    status: "published",
    titleEn: "How to check a supplier before you pay",
    titleUr: "ادائیگی سے پہلے سپلائر کی جانچ کیسے کریں",
    excerptEn: "Practical steps to reduce risk when dealing with a new counterparty.",
    bodyEn: `## Start with the profile

- Read the verification label and what it means (see the verification policy). "Admin verified" is stronger than "Phone verified", but none is a guarantee.
- Look at how long the business has been on the platform, how many listings it has, and whether its listings are specific and consistent.

## Talk to them

- Call the number on the profile and ask detailed questions about the goods: grade, origin, crop year, packaging, availability.
- Ask for the business address and, for larger deals, visit or send someone to inspect the goods.
- Ask for a sample or a recent lab/test report where relevant.

## Check documents

- Ask for NTN / STRN or a registration certificate and check that the name matches the business you are dealing with.
- Check that the bank account for payment is in the business's name, not an individual's, unless you know the person.

## Reduce payment risk

- Avoid paying the full amount in advance to a new supplier. Use partial payment, payment on inspection, or a trusted intermediary.
- Agree quantity, quality, unit, price, delivery point and timing **in writing** (WhatsApp messages count) before paying.
- Be cautious of prices far below the published market rate.

## If something goes wrong

Use the **Report** button on the supplier's profile or listing. Reports are reviewed and may lead to removal of the label or the account. ${BRAND} cannot recover money for you — it is a discovery platform — so prevention matters most.`,
  },
  {
    slug: "how-market-rates-work",
    kind: "guide",
    status: "published",
    titleEn: "How market rates on this platform work",
    titleUr: "اس پلیٹ فارم پر مارکیٹ ریٹ کیسے کام کرتے ہیں",
    excerptEn: "What each rate type means, where rates come from, and why some are marked stale.",
    bodyEn: `## Four kinds of rate

Every rate published on ${BRAND} carries a **type**, a **source**, an **observation date** and a **unit**:

- **Indicative market rate** — a representative rate observed in a named market on a given day. It is a guide, not an offer.
- **Verified supplier offer** — a price a specific verified supplier actually offered, valid until a stated date.
- **Buyer-reported rate** — a rate a buyer reported paying. Useful but unverified.
- **Official or published reference rate** — a rate published by a market committee, government body or association, with a reference.

The types are displayed separately and never blended into a single number.

## Freshness

Rates are only useful when fresh. A rate older than the freshness limit set by the administrator is labelled **stale** and excluded from "today's rates", though it stays visible as history. When no current rate exists for a commodity and market you will see **"Rate not available yet"** and a button to request quotes from suppliers instead.

## Where rates come from

Rates are entered by the platform's price editors from the sources named on each record, or imported from structured files. ${BRAND} does not invent rates, does not scrape restricted sources, and does not describe a rate as "live" unless there is a working data feed behind it.

## How to use them

Use rates to sanity-check offers and to decide when to buy or sell — then confirm the actual price, unit and quality directly with the supplier.`,
  },
];

export type SeedSetting = { key: string; value: unknown; description: string };

export const SITE_SETTINGS_SEED: SeedSetting[] = [
  { key: "brand.name", value: "MandiLink", description: "Brand name shown across the site" },
  { key: "brand.tagline", value: "Know the market. Find the supplier. Make the deal.", description: "Brand tagline" },
  { key: "brand.product_name", value: "Pakistan Commodity Market", description: "Product name used in metadata" },
  { key: "contact.email", value: "", description: "Public support email" },
  { key: "contact.phone", value: "", description: "Public support phone" },
  { key: "contact.whatsapp", value: "", description: "Public support WhatsApp number" },
  { key: "languages.enabled", value: ["en", "ur"], description: "Enabled interface languages" },
  { key: "listings.default_expiry_days", value: 30, description: "Days until a published listing expires unless refreshed" },
  { key: "listings.require_moderation", value: true, description: "Require admin review before listings go public" },
  { key: "prices.stale_after_days", value: 7, description: "Published rates older than this are labelled stale" },
  { key: "prices.default_currency", value: "PKR", description: "Default currency code" },
  { key: "units.maund_kg", value: 40, description: "Kilograms per maund used for normalization" },
  { key: "rfq.expiry_days", value: 14, description: "Days until an open RFQ expires" },
  { key: "moderation.auto_publish_verified_sellers", value: false, description: "Skip review for admin-verified sellers in auto-moderation categories" },
  { key: "payments.enabled", value: false, description: "Online payments (disabled in the initial release)" },
  { key: "payments.provider", value: "none", description: "Payment provider key for a future integration" },
  { key: "seo.default_title_suffix", value: " | MandiLink", description: "Appended to page titles" },
  { key: "seo.default_description", value: "Find commodity suppliers, check published market rates and send enquiries across Pakistan. Free B2B marketplace for grains, metals, construction materials and more.", description: "Default meta description" },
  { key: "analytics.enabled", value: true, description: "Record privacy-conscious product analytics events" },
];

export type SeedFlag = { key: string; enabled: boolean; description: string };

export const FEATURE_FLAGS_SEED: SeedFlag[] = [
  { key: "payments", enabled: false, description: "Online payment collection (future)" },
  { key: "subscriptions", enabled: false, description: "Paid subscription plans (future)" },
  { key: "featured_listings_paid", enabled: false, description: "Paid featured supplier listings (future)" },
  { key: "whatsapp_notifications", enabled: false, description: "WhatsApp Business notifications (requires provider)" },
  { key: "email_notifications", enabled: false, description: "Email notifications (requires SMTP)" },
  { key: "voice_search", enabled: false, description: "Voice search (future enhancement)" },
  { key: "premium_insights", enabled: false, description: "Premium market insights (future)" },
];

export type SeedHomepageSection = { key: string; titleEn: string; titleUr?: string; sortOrder: number; isEnabled: boolean };

export const HOMEPAGE_SECTIONS_SEED: SeedHomepageSection[] = [
  { key: "hero", titleEn: "What would you like to do?", titleUr: "آپ کیا کرنا چاہتے ہیں؟", sortOrder: 1, isEnabled: true },
  { key: "search", titleEn: "Search commodities", titleUr: "اجناس تلاش کریں", sortOrder: 2, isEnabled: true },
  { key: "categories", titleEn: "Popular categories", titleUr: "مقبول زمرے", sortOrder: 3, isEnabled: true },
  { key: "prices", titleEn: "Today's market rates", titleUr: "آج کے مارکیٹ ریٹ", sortOrder: 4, isEnabled: true },
  { key: "listings", titleEn: "Recently added listings", titleUr: "حال ہی میں شامل کی گئی لسٹنگز", sortOrder: 5, isEnabled: true },
  { key: "suppliers", titleEn: "Featured and verified suppliers", titleUr: "نمایاں اور تصدیق شدہ سپلائرز", sortOrder: 6, isEnabled: true },
  { key: "how_it_works", titleEn: "How it works", titleUr: "یہ کیسے کام کرتا ہے", sortOrder: 7, isEnabled: true },
  { key: "browse_categories", titleEn: "Browse commodities by category", titleUr: "زمرے کے لحاظ سے اجناس دیکھیں", sortOrder: 8, isEnabled: true },
  { key: "browse_cities", titleEn: "Browse suppliers by city", titleUr: "شہر کے لحاظ سے سپلائرز دیکھیں", sortOrder: 9, isEnabled: true },
  { key: "guides", titleEn: "Market guides", titleUr: "مارکیٹ گائیڈز", sortOrder: 10, isEnabled: true },
];
