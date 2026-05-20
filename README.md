# Stoic Meditations

The full website package for `stoicmeditations.site`. Static HTML plus Vercel Functions, one Vercel project hosts the whole site.

```
stoicmeditations.site              → apps/main/         (link-in-bio for @stoicismwidget)
stoicmeditations.site/book         → apps/book/         (the $9.99 PDF sales page)
stoicmeditations.site/audio        → apps/audiobook/    (the $9.99 audiobook sales page, three voices)
stoicmeditations.site/wallpapers   → apps/wallpapers/   (three $5 wallpaper bundles)
stoicmeditations.site/bundle       → apps/bundle/       (the $20 complete pack)
```

The brand is **Stoic Meditations**. The Instagram handle is **@stoicismwidget** (it predates the site rename and is kept intentionally different).

---

## Repository structure

```
stoic-meditations/
├── README.md                       ← you are here
├── vercel.json                     ← path-based rewrites, one project serves all product pages
├── api/                            ← Razorpay checkout, webhooks, delivery, admin exports
├── .gitignore
│
├── apps/
│   ├── main/
│   │   └── index.html              ← the link-in-bio site, ~545 lines, self-contained
│   ├── bundle/
│   │   └── index.html              ← $20 complete pack landing page
│   ├── book/
│   │   ├── index.html              ← book sales page, popup email capture, Razorpay checkout
│   │   ├── cover.jpg               ← used by the hero section
│   │   ├── preview.html            ← full compiled book source used to generate the paid PDF
│   │   └── downloads/
│   │       └── 14-days-to-a-stoic-mind.pdf
│   ├── audiobook/
│   │   ├── index.html              ← audiobook sales page, voice picker + sample player
│   │   ├── cover.png               ← hero cover image
│   │   ├── samples/                ← 30-second sample mp3s for the three voices
│   │   └── audio/
│   │       ├── af_heart/           ← voice 1, 14 chapter mp3s + .m4b (~104 MB)
│   │       ├── am_michael/         ← voice 2, same shape (~113 MB)
│   │       ├── bm_george/          ← voice 3, same shape (~108 MB)
│   │       └── manifest.json       ← chapter list metadata
│   └── wallpapers/
│       ├── index.html              ← three-bundle sales page, Razorpay checkout
│       ├── thank-you.html          ← legacy wallpaper thank-you page
│       └── downloads/
│           ├── bundle-a-strength-and-discipline.zip      (20 wallpapers)
│           ├── bundle-b-solitude-and-stillness.zip       (20 wallpapers)
│           └── bundle-c-wisdom-and-reflection.zip        (20 wallpapers)
│
├── newsletters/                    ← five lessons sent on email signup
│   ├── 01-dichotomy-of-control.md
│   ├── 02-look-within.md
│   ├── 03-the-verdict.md
│   ├── 04-postponing.md
│   └── 05-imagination.md
│
└── docs/
    ├── email-setup.md              ← Resend setup for lessons and paid delivery
    ├── vercel-deploy.md            ← one-project deploy + DNS for all four subdomains
    └── voice-rules.md              ← copy/brand rules (no em dashes, no AI tells, etc.)
```

Total repo size: about 430 MB (mostly audiobook mp3s and wallpaper zips). All files are under 100 MB so no Git LFS needed.

---

## Run locally

Install dependencies first:

```bash
npm install
```

For rough visual checks, you can still open static pages directly in a browser:

```bash
open apps/main/index.html
open apps/book/index.html
open apps/audiobook/index.html
open apps/wallpapers/index.html
open apps/bundle/index.html
```

The cross-site card links and product assets use path routes (`/book`, `/audio`, `/wallpapers`), so the real end-to-end test target is a Vercel preview or production deploy. The checkout buttons require Vercel Functions plus the env vars below.

For local API testing, use Vercel's local runtime:

```bash
npm install
npm run db:generate
npm run db:migrate
npx vercel dev
```

Create `.env.local` with the required Razorpay, Neon/Postgres, admin, and email values before testing paid checkout.

---

## Deploy

See [`docs/vercel-deploy.md`](docs/vercel-deploy.md) for the full walkthrough. Three-line summary:

1. Push this repo to GitHub.
2. Create one Vercel project, import the repo, hit deploy.
3. In Vercel → Settings → Domains, attach `stoicmeditations.site` and `www.stoicmeditations.site`. Add the DNS records Vercel gives you to the registrar.

Every `git push` to `main` after that redeploys all four sites.

---

## Email Automation

Free lessons and paid product delivery both use Resend through Vercel Functions.

Free lesson signup:

```text
POST /api/subscribe-lessons
```

Paid product delivery is triggered after Razorpay payment verification or a verified `payment.captured` webhook. The current v1 emails permanent direct download links.

---

## Brand voice

See [`docs/voice-rules.md`](docs/voice-rules.md) for the full rules. The two that matter most:

- **No em dashes (—) in your own prose, ever.** They read as AI-written. Exception: em dashes inside historic quotes are the translator's, leave them.
- **Every quote must be real and cited.** Author, work, chapter/letter/fragment, translator, year. No Goodreads-only quotes.

---

## Payment, Delivery, And Accounting

Razorpay is the only payment processor. The site creates a local `digital_orders` row first, creates a Razorpay order server-side, verifies payment signatures server-side, stores normalized payment records plus raw Razorpay payloads, then emails the buyer permanent download links through Resend.

Database tables are defined in `prisma/schema.prisma`:

- `customers`
- `digital_orders`
- `razorpay_payments`
- `webhook_events`
- `refunds`
- `payouts`
- `deliveries`
- `monthly_summaries`

Admin dashboard:

```text
/admin
```

CSV export endpoint:

```text
/api/admin/export-sales.csv
```

Monthly summary:

```bash
npm run monthly:summary
# or SUMMARY_MONTH=2026-05 USD_INR_RATE=83.2 npm run monthly:summary
```

Webhook URL in Razorpay:

```text
https://stoicmeditations.site/api/webhooks/razorpay
```

Enable these events:

- `payment.captured`
- `payment.failed`
- `refund.created`
- `refund.processed`
- `order.paid`

## Launch Configuration

The deploy works without live secrets, but revenue/email features need these values configured.

| Item | Where | Notes |
|---|---|---|
| Razorpay key ID | Vercel env var | `RAZORPAY_KEY_ID`. Safe to expose to Razorpay Checkout. |
| Razorpay key secret | Vercel env var | `RAZORPAY_KEY_SECRET`. Server-side only. |
| Razorpay webhook secret | Vercel env var | `RAZORPAY_WEBHOOK_SECRET`. Must match the webhook secret configured in Razorpay. |
| Database URL | Vercel env var | `DATABASE_URL` from Neon/Postgres. |
| Admin password | Vercel env var | `ADMIN_PASSWORD` protects `/admin` and export APIs. |
| Email API key | Vercel env var | `EMAIL_API_KEY` for Resend. Used for free lessons and paid downloads. |
| Email from | Vercel env var | `EMAIL_FROM`, for example `Stoic Meditations <downloads@stoicmeditations.site>`. Use a verified Resend sender. |
| Download secret | Vercel env var | `EBOOK_DOWNLOAD_SECRET`, reserved for signed links later. Current v1 emails permanent direct links. |
| Book PDF | `apps/book/downloads/` | Regenerate from `apps/book/preview.html` with `npm run generate:book-pdf`. |

## Checkout Test Checklist

1. Run `npm run db:generate` and `npm run db:migrate`.
2. Start `npx vercel dev`.
3. Open `/book`, submit checkout, and confirm the billing-country modal appears before Razorpay opens.
4. Complete a Razorpay test payment and confirm `/thank-you?order_id=...` shows downloads.
5. Confirm `digital_orders` has `created -> paid`, `razorpay_payments.raw_payload_json` is populated, and `deliveries` has a sent or failed record.
6. Trigger a Razorpay webhook test and confirm duplicate deliveries are not created.
7. Open `/admin`, verify totals and country mismatch flags, then download the CSV export.

---

## Brand contact

- Site: `stoicmeditations.site`
- Instagram: [@stoicismwidget](https://instagram.com/stoicismwidget)
