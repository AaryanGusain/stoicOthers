const { readJson, sendJson } = require('./_http');
const { cleanString, cleanObject } = require('./_web-subscriptions');

const ALLOWED_EVENTS = new Set([
  'funnel_screen_viewed',
  'funnel_back_tapped',
  'funnel_answer_selected',
  'funnel_quote_selected',
  'funnel_widget_selected',
  'funnel_theme_selected',
  'funnel_font_selected',
  'funnel_plan_selected',
  'funnel_primary_cta_tapped',
  'funnel_personalization_completed',
  'funnel_email_submitted',
  'funnel_email_failed',
  'funnel_checkout_started',
  'funnel_checkout_opened',
  'funnel_checkout_dismissed',
  'funnel_checkout_failed',
  'funnel_payment_returned',
  'funnel_payment_succeeded',
  'funnel_payment_failed',
  'funnel_payment_verification_failed',
  'funnel_abandoned'
]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const event = cleanString(body.event, 120);
  const sessionId = cleanString(body.session_id, 160);
  if (!event || !ALLOWED_EVENTS.has(event) || !sessionId) {
    return sendJson(res, 400, { error: 'Invalid funnel event' });
  }

  if (!process.env.POSTHOG_API_KEY) {
    return sendJson(res, 202, { ok: true, skipped: true });
  }

  const properties = cleanObject(body.properties) || {};
  delete properties.email;
  delete properties.customer_email;

  try {
    const response = await fetch(`${process.env.POSTHOG_HOST || 'https://us.i.posthog.com'}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event,
        properties: {
          distinct_id: sessionId,
          session_id: sessionId,
          step_id: cleanString(body.step_id, 120),
          step_index: Number.isInteger(body.step_index) ? body.step_index : null,
          funnel_version: cleanString(body.funnel_version, 80) || 'stoic_web_v1',
          ...properties
        }
      })
    });
    if (!response.ok) throw new Error('PostHog capture failed');
    return sendJson(res, 202, { ok: true });
  } catch (_error) {
    return sendJson(res, 202, { ok: true, delayed: true });
  }
};
