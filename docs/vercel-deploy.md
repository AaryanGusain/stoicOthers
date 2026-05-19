# Deploy to Vercel

One Vercel project hosts all four sites. A single `vercel.json` at the repo root uses host-based rewrites to route each subdomain to its folder.

```
stoicmeditations.com               → apps/main/
book.stoicmeditations.com          → apps/book/
audio.stoicmeditations.com         → apps/audiobook/
wallpapers.stoicmeditations.com    → apps/wallpapers/
```

One push to `main`, all four sites redeploy together.

---

## 1. Buy the domain

Recommended registrars: [Porkbun](https://porkbun.com) or [Namecheap](https://namecheap.com). Both have reasonable prices and clean DNS UIs. `.com` is around $10–12/year.

Buy `stoicmeditations.com`. You do not need to buy subdomains separately; subdomains are configured via DNS records under the root domain.

## 2. Create the Vercel project

1. Sign up at [vercel.com](https://vercel.com) (free Hobby plan is enough to start).
2. Click **Add New… → Project**.
3. Import the GitHub repo (you will need to grant Vercel access to your GitHub account first).
4. **Framework Preset**: select **Other** (this is a static-only site, no build step).
5. **Root Directory**: leave as the repo root (`./`).
6. **Build Command**: leave empty.
7. **Output Directory**: leave empty (Vercel serves the repo as-is, with `vercel.json` doing the routing).
8. Click **Deploy**.

The first deploy will succeed but the rewrites won't take effect until domains are attached.

## 3. Attach the four domains

In the Vercel project, go to **Settings → Domains** and add each of these one at a time:

- `stoicmeditations.com`
- `www.stoicmeditations.com` (Vercel will offer to redirect this to the apex; accept)
- `book.stoicmeditations.com`
- `audio.stoicmeditations.com`
- `wallpapers.stoicmeditations.com`

For each one, Vercel will show the exact DNS record to add. Two patterns:

**For the apex** (`stoicmeditations.com`):
- Add an **A record** at the registrar:
  ```
  Type: A    Host: @    Value: 76.76.21.21
  ```

**For each subdomain** (`book`, `audio`, `wallpapers`, `www`):
- Add a **CNAME record**:
  ```
  Type: CNAME    Host: book        Value: cname.vercel-dns.com
  Type: CNAME    Host: audio       Value: cname.vercel-dns.com
  Type: CNAME    Host: wallpapers  Value: cname.vercel-dns.com
  Type: CNAME    Host: www         Value: cname.vercel-dns.com
  ```

(The exact values Vercel shows on the day you deploy are the source of truth. Use those if they differ from what's above.)

DNS propagation usually takes 5–30 minutes. Vercel will say `Valid Configuration` next to each domain when it's ready. SSL certificates are issued automatically.

## 4. Verify the routing

Once all domains show `Valid Configuration`:

- `https://stoicmeditations.com` should load the main link-in-bio site.
- `https://book.stoicmeditations.com` should load the book sales page.
- `https://audio.stoicmeditations.com` should load the audiobook page.
- `https://wallpapers.stoicmeditations.com` should load the wallpapers page.

If any of these load the wrong site, check `vercel.json` at the repo root and confirm the `has.value` for that host matches the domain exactly.

## 5. Future deploys

Every `git push` to `main` triggers a redeploy of the whole project. Pull requests get preview URLs automatically. There is no manual deploy step.

---

## File-size notes

- The audiobook folder (`apps/audiobook/audio/`) is about 325 MB. Vercel's free Hobby plan allows projects up to 1 GB total per deployment, so this fits with margin.
- Each individual file is under 100 MB (the largest is the `~42 MB .m4b`). No Git LFS required.
- If you ever exceed Hobby plan limits, the cheapest upgrade is Vercel Pro ($20/mo). An alternative is to move heavy files (mp3s, zips) to Cloudflare R2 or Vercel Blob storage and reference them by URL from the HTML. Out of scope for this initial deploy.

## What's NOT yet wired up (deploy will still work without these)

- **Kit form ID**: replace `REPLACE_WITH_KIT_FORM_ID` in `apps/main/index.html` and `apps/book/index.html`. See [kit-setup.md](kit-setup.md).
- **Stripe Payment Links** for the wallpaper bundles: in `apps/wallpapers/index.html`, search for `STRIPE_PAYMENT_LINK_A` / `_B` / `_C` and replace with the real Stripe Payment Link URLs once Stripe is set up.
- **Wallpaper fulfillment endpoint**: `apps/wallpapers/thank-you.html` POSTs to `https://wallpapers.stoicmeditations.com/fulfill`. That endpoint does not yet exist — it needs to be built as a Vercel Function or a Cloudflare Worker. Until it exists, the thank-you page will show an error state; the email link from Stripe is the user's working delivery path.
- **Book Gumroad/Stripe checkout** for the $9 ebook on `apps/book/index.html`. Currently the buy form captures the email and shows a placeholder alert.
- **Book PDF and EPUB downloads** in `apps/book/downloads/`. Files not yet produced.
