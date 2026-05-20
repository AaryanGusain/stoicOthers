# Deploy to Vercel

One Vercel project hosts the main site and product pages. A single `vercel.json` at the repo root uses path-based rewrites to route each page to its folder.

```
stoicmeditations.site              → apps/main/
stoicmeditations.site/book         → apps/book/
stoicmeditations.site/audio        → apps/audiobook/
stoicmeditations.site/wallpapers   → apps/wallpapers/
stoicmeditations.site/bundle       → apps/bundle/
```

One push to `main`, all four sites redeploy together.

---

## 1. Buy the domain

Recommended registrars: [Porkbun](https://porkbun.com) or [Namecheap](https://namecheap.com). Both have reasonable prices and clean DNS UIs. `.com` is around $10–12/year.

Buy `stoicmeditations.site`. You do not need to buy subdomains separately; subdomains are configured via DNS records under the root domain.

## 2. Create the Vercel project

1. Sign up at [vercel.com](https://vercel.com) (free Hobby plan is enough to start).
2. Click **Add New… → Project**.
3. Import the GitHub repo (you will need to grant Vercel access to your GitHub account first).
4. **Framework Preset**: select **Other** (this is a static-only site, no build step).
5. **Root Directory**: leave as the repo root (`./`).
6. **Build Command**: leave empty.
7. **Output Directory**: leave empty (Vercel serves the repo as-is, with `vercel.json` doing the routing).
8. Click **Deploy**.

The first deploy will succeed. Preview URLs will also support `/book`, `/audio`, and `/wallpapers`.

## 3. Attach the domain

In the Vercel project, go to **Settings → Domains** and add:

- `stoicmeditations.site`
- `www.stoicmeditations.site` (Vercel will offer to redirect this to the apex; accept)

For each one, Vercel will show the exact DNS record to add. Two patterns:

**For the apex** (`stoicmeditations.site`):
- Add an **A record** at the registrar:
  ```
  Type: A    Host: @    Value: 76.76.21.21
  ```

**For `www`**:
- Add a **CNAME record**:
  ```
  Type: CNAME    Host: www         Value: cname.vercel-dns.com
  ```

(The exact values Vercel shows on the day you deploy are the source of truth. Use those if they differ from what's above.)

DNS propagation usually takes 5–30 minutes. Vercel will say `Valid Configuration` next to each domain when it's ready. SSL certificates are issued automatically.

## 4. Verify the routing

Once all domains show `Valid Configuration`:

- `https://stoicmeditations.site` should load the main link-in-bio site.
- `https://stoicmeditations.site/book` should load the book sales page.
- `https://stoicmeditations.site/audio` should load the audiobook page.
- `https://stoicmeditations.site/wallpapers` should load the wallpapers page.
- `https://stoicmeditations.site/bundle` should load the complete pack page.
- `https://stoicmeditations.site/admin` should load the password-protected sales dashboard.

If any of these load the wrong site, check `vercel.json` at the repo root and confirm the path rewrites are ordered before the final catch-all rewrite.

## 5. Future deploys

Every `git push` to `main` triggers a redeploy of the whole project. Pull requests get preview URLs automatically. There is no manual deploy step.

---

## File-size notes

- The audiobook folder (`apps/audiobook/audio/`) is about 325 MB. Vercel's free Hobby plan allows projects up to 1 GB total per deployment, so this fits with margin.
- Each individual file is under 100 MB (the largest is the `~42 MB .m4b`). No Git LFS required.
- If you ever exceed Hobby plan limits, the cheapest upgrade is Vercel Pro ($20/mo). An alternative is to move heavy files (mp3s, zips) to Cloudflare R2 or Vercel Blob storage and reference them by URL from the HTML. Out of scope for this initial deploy.

## Runtime configuration

- **Razorpay keys**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in Vercel Project Settings -> Environment Variables. Use test mode first, then switch to live.
- **Database**: set `DATABASE_URL` to your Neon/Postgres connection string, then run `npm run db:migrate`.
- **Email delivery**: set `EMAIL_API_KEY` for Resend and `EMAIL_FROM` to a verified sender. This powers both the five free lessons and paid product delivery.
- **Admin**: set `ADMIN_PASSWORD` before using `/admin` or `/api/admin/export-sales.csv`.
- **Download secret**: set `EBOOK_DOWNLOAD_SECRET` for future signed links. Current v1 uses permanent direct download links.
- **Book PDF**: regenerate with `npm run generate:book-pdf` after editing `apps/book/preview.html`.

## Razorpay webhook

Add this webhook URL in Razorpay:

```text
https://stoicmeditations.site/api/webhooks/razorpay
```

Subscribe to:

- `payment.captured`
- `payment.failed`
- `refund.created`
- `refund.processed`
- `order.paid`
