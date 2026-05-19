# Book downloads

This folder will hold the final book files once ready:

- `14-days-to-a-stoic-mind.pdf` — typeset PDF, delivered after Gumroad/Stripe checkout
- `14-days-to-a-stoic-mind.epub` — EPUB for Kindle/iBooks/Kobo

Until these are produced, the buy form in `apps/book/index.html` will not actually deliver files. The Gumroad/Stripe wiring (see the `// TODO: Wire to Gumroad or Stripe Checkout` comment in the inline `<script>`) is the other half of this dependency.

When the files exist, place them here. Reference them from the checkout fulfillment flow.
