# Kit (ConvertKit) setup

Kit is the email service that captures signups from the site and sends the five free lessons. The site does the form UI; Kit does everything else: storing subscribers, sending emails, managing unsubscribes.

Free tier covers up to 10,000 subscribers. No credit card needed to start.

---

## 1. Create the account

1. Go to [kit.com](https://kit.com) and sign up for a free account.
2. Pick a sender name (e.g., `Stoic Meditations`) and sender email (e.g., `hello@stoicmeditations.com` once the domain is set up; any working email will do until then).
3. Verify the sender email when Kit asks.

## 2. Create the form

1. In Kit's dashboard, go to **Grow → Landing Pages & Forms → Create New**.
2. Choose **Form**, then **Inline**.
3. Pick any template (we are not going to use Kit's HTML, only its data pipe). Save it.
4. Name it `Stoic Meditations · Five Free Lessons`.
5. Open the form's settings. The URL in your browser will look like `https://app.kit.com/forms/1234567/edit`. **Copy the numeric ID** (`1234567` in this example). This is the `KIT_FORM_ID`.

## 3. Wire the form ID into the site

Open both of these files and replace the placeholder string:

- `apps/main/index.html` — search for `REPLACE_WITH_KIT_FORM_ID` and paste the numeric ID in its place.
- `apps/book/index.html` — same search-and-replace.

The constant looks like this:

```js
const KIT_FORM_ID = 'REPLACE_WITH_KIT_FORM_ID';
```

After replacement:

```js
const KIT_FORM_ID = '1234567';
```

Commit and redeploy. Form submissions now POST to Kit.

## 4. Build the welcome sequence

1. In Kit, go to **Send → Sequences → Create New**.
2. Name it `Five Free Stoic Lessons`.
3. Add five emails. For each one:
   - Open `newsletters/0X-*.md` from the repo.
   - Copy the `subject:` value from the frontmatter into Kit's **Subject** field.
   - Copy the `preview:` value into Kit's **Preview text** field.
   - Copy the body (everything below the closing `---`) into Kit's editor. Kit understands markdown for headings, bold, blockquotes, and links, but verify the formatting renders correctly in the preview pane before saving.
   - Set the **Send delay** to `0 minutes` for all five. They all go out the moment someone subscribes.
4. Publish the sequence.

## 5. Connect form → sequence

1. Go back to the form (`Stoic Meditations · Five Free Lessons`).
2. Open **Settings → Incentive** (or **Automations**, depending on Kit's UI revision).
3. Set the "After subscription" action to **Subscribe to sequence** and pick `Five Free Stoic Lessons`.
4. Save.

## 6. Test end-to-end

1. On the live site (or a Vercel preview deploy), enter your own email in the form.
2. Within a few minutes, you should receive five emails. Verify:
   - Subject and preview text show correctly in the inbox list.
   - Each email's body renders without broken markdown.
   - Links work.
   - No "Sent from Kit" branding sneaks in (free tier may add a small footer; that's fine).
3. Unsubscribe from one of the emails to verify the unsubscribe link works.

## Notes

- **No API key needed** for this setup. Kit's `/forms/<id>/subscriptions` endpoint is public; the form ID itself is the only credential, and it's safe to ship in the front-end source.
- Subscribers added via the public form endpoint count as **confirmed opt-ins**. They go straight into the sequence.
- If you want a **double opt-in** (subscriber clicks a confirmation email before being added), turn that on in the form's settings. The site code does not need to change.
- For ongoing broadcasts later (a weekly newsletter), use Kit's **Broadcasts** tab. Same subscriber list.

## Switching providers later

Every place the site talks to Kit is one `fetch()` call inside a single inline `<script>` block in two files (`apps/main/index.html`, `apps/book/index.html`). If you ever migrate to Beehiiv, Buttondown, or a custom Resend-based setup, the swap is one function in each file.
