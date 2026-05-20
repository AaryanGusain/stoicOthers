# Email setup

The site uses Resend for both email jobs:

- Five free lesson signup through `POST /api/subscribe-lessons`
- Paid product delivery after verified Razorpay payment

## Configure Resend

1. Create a Resend account.
2. Verify a sending domain or sender address.
3. Add these Vercel environment variables:

```text
EMAIL_API_KEY=...
EMAIL_FROM=Stoic Meditations <downloads@stoicmeditations.site>
```

Use the same values in `.env.local` when testing with `npx vercel dev`.

## Free lessons

The lesson source files live in `newsletters/`. The API reads every `0X-*.md` file, parses the `subject` and `preview` frontmatter, then sends all five lessons immediately.

Endpoint:

```text
POST /api/subscribe-lessons
```

Payload:

```json
{ "email": "buyer@example.com" }
```

## Paid downloads

After Razorpay checkout succeeds, `POST /api/verify-razorpay-payment` verifies the signature, fetches the payment from Razorpay, marks the local order paid, and sends the buyer their download links.

The webhook route `POST /api/webhooks/razorpay` also handles verified `payment.captured` events and is idempotent, so the same order should not be delivered twice.

Current v1 sends permanent direct links. `EBOOK_DOWNLOAD_SECRET` is reserved for a later signed-link implementation.
