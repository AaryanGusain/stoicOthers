# Stoic Meditations

The full website package for `stoicmeditations.com` and its three subdomains. Static HTML, no build step, one Vercel project hosts all four sites.

```
stoicmeditations.com               → apps/main/         (link-in-bio for @stoicismwidget)
book.stoicmeditations.com          → apps/book/         (the $9 ebook sales page)
audio.stoicmeditations.com         → apps/audiobook/    (the $10 audiobook sales page, three voices)
wallpapers.stoicmeditations.com    → apps/wallpapers/   (three $5 wallpaper bundles)
```

The brand is **Stoic Meditations**. The Instagram handle is **@stoicismwidget** (it predates the site rename and is kept intentionally different).

---

## Repository structure

```
stoic-meditations/
├── README.md                       ← you are here
├── vercel.json                     ← host-based rewrites, one project serves all four sites
├── .gitignore
│
├── apps/
│   ├── main/
│   │   └── index.html              ← the link-in-bio site, ~545 lines, self-contained
│   ├── book/
│   │   ├── index.html              ← book sales page, popup email capture, buy form (TODO)
│   │   ├── cover.jpg               ← used by the hero section
│   │   ├── preview.html            ← full compiled book, linked from "Open the full live preview"
│   │   └── downloads/
│   │       └── README.md           ← placeholder; PDF + EPUB get dropped here when ready
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
│       ├── index.html              ← three-bundle sales page, Stripe Payment Links (TODO)
│       ├── thank-you.html          ← post-checkout fulfillment page (TODO: backend)
│       └── downloads/
│           ├── bundle-a-solitude-and-stillness.zip       (~28 MB, 20 wallpapers)
│           ├── bundle-b-strength-and-discipline.zip      (~28 MB, 20 wallpapers)
│           └── bundle-c-wisdom-and-reflection.zip        (~44 MB, 20 wallpapers)
│
├── newsletters/                    ← five lessons sent on email signup, paste into Kit
│   ├── 01-dichotomy-of-control.md
│   ├── 02-look-within.md
│   ├── 03-the-verdict.md
│   ├── 04-postponing.md
│   └── 05-imagination.md
│
└── docs/
    ├── kit-setup.md                ← step-by-step Kit (ConvertKit) account + sequence setup
    ├── vercel-deploy.md            ← one-project deploy + DNS for all four subdomains
    └── voice-rules.md              ← copy/brand rules (no em dashes, no AI tells, etc.)
```

Total repo size: about 430 MB (mostly audiobook mp3s and wallpaper zips). All files are under 100 MB so no Git LFS needed.

---

## Run locally

No build, no install, nothing to install. Open any of these in a browser:

```bash
open apps/main/index.html
open apps/book/index.html
open apps/audiobook/index.html
open apps/wallpapers/index.html
```

The cross-site card links on `apps/main/index.html` point to production URLs (`book.stoicmeditations.com`, etc.), so they will 404 until the domain is live. The forms log to the browser console until you wire up Kit.

---

## Deploy

See [`docs/vercel-deploy.md`](docs/vercel-deploy.md) for the full walkthrough. Three-line summary:

1. Push this repo to GitHub.
2. Create one Vercel project, import the repo, hit deploy.
3. In Vercel → Settings → Domains, attach all four domains. Add the DNS records Vercel gives you to the registrar.

Every `git push` to `main` after that redeploys all four sites.

---

## Email automation (Kit)

See [`docs/kit-setup.md`](docs/kit-setup.md) for full instructions.

Short version:
1. Create a Kit account and a form. Copy the form ID from the URL.
2. Paste the form ID into `apps/main/index.html` and `apps/book/index.html` where `REPLACE_WITH_KIT_FORM_ID` lives.
3. Build a Sequence in Kit called "Five Free Stoic Lessons" with five emails. Copy each newsletter from `newsletters/0X-*.md` into a Kit email, all with delay = 0 (so they all send the moment someone subscribes).
4. Wire form → sequence in Kit's automation settings.

Why Kit: free up to 10,000 subscribers, purpose-built for creator newsletters, no backend code or serverless functions needed.

---

## Brand voice

See [`docs/voice-rules.md`](docs/voice-rules.md) for the full rules. The two that matter most:

- **No em dashes (—) in your own prose, ever.** They read as AI-written. Exception: em dashes inside historic quotes are the translator's, leave them.
- **Every quote must be real and cited.** Author, work, chapter/letter/fragment, translator, year. No Goodreads-only quotes.

---

## Known TODOs (paid features the friend will wire up)

These are intentionally left as placeholders. The deploy works without them; revenue features come online when each is filled in.

| TODO | Where | Notes |
|---|---|---|
| Kit form ID | `apps/main/index.html`, `apps/book/index.html` | Search `REPLACE_WITH_KIT_FORM_ID`. See `docs/kit-setup.md`. |
| Book checkout (Gumroad or Stripe) | `apps/book/index.html` | Currently captures email and shows an alert. Wire to Gumroad easiest; Stripe more work. |
| Book PDF + EPUB files | `apps/book/downloads/` | Drop the files here. The fulfillment flow (which page links them) is part of the checkout TODO. |
| Stripe Payment Links for wallpapers | `apps/wallpapers/index.html` | Search `STRIPE_PAYMENT_LINK_A`, `_B`, `_C`. Create 3 Stripe Payment Links at `$5` each, paste their URLs. |
| Wallpaper fulfillment endpoint | `apps/wallpapers/thank-you.html` | The thank-you page POSTs to `https://wallpapers.stoicmeditations.com/fulfill` to get a signed download URL given a Stripe `session_id`. That endpoint does not yet exist. It needs to be built as a Vercel Function (recommended, lives in this repo) or a Cloudflare Worker. The endpoint should: 1) verify the Stripe session, 2) look up the bundle code, 3) return `{ bundle_name, url }` pointing to the matching zip in `apps/wallpapers/downloads/` with a short-lived signed URL or similar. |
| Audiobook checkout | `apps/audiobook/index.html` | Same as the book: currently captures email and alerts. Wire to Gumroad or Stripe. |

---

## Brand contact

- Site: `stoicmeditations.com`
- Instagram: [@stoicismwidget](https://instagram.com/stoicismwidget)
