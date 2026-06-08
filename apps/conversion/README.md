# Stoic Widgets — Landing Page

Single-purpose landing page for the **Stoic Widgets** iOS app. Built to receive paid
traffic from Instagram / Facebook ads and send it straight to the App Store.

**Live app:** [Stoic Widgets: Daily Wisdom](https://apps.apple.com/us/app/stoic-widgets-daily-wisdom/id6769972958)

## What it is

A static, mobile-first page with one job: ad → tap → App Store. No navigation, no
JavaScript, no tracking — just the app icon, the promise, an official Apple
"Download on the App Store" badge, a real screenshot, and three trust points.

```
landing/
├── index.html              # the whole page (inline CSS, zero JS)
└── assets/
    ├── app-icon.png         # official icon (from Apple)
    ├── app-store-badge.svg  # official Apple download badge
    └── app-hero.png         # real iPhone screenshot of the app
```

## Run locally

```bash
python3 -m http.server 8000
# then open http://127.0.0.1:8000
```

## Deploy

It's a static site — drop the folder on any static host:

- **Netlify / Vercel / Cloudflare Pages** — connect this repo (works with private repos).
- **GitHub Pages** — requires a public repo on the free plan.

Point `stoicmeditations.site` (or a subdomain) at the deploy and aim the ad links there.

## Notes

- All claims on the page are real: the 5.0★ rating, "Free", and "Requires iOS 15.1+"
  all match the live App Store listing.
- Brand palette and fonts match `stoicmeditations.site` (paper/sepia, Cormorant
  Garamond + Inter Tight).
