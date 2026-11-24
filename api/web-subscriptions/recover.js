const { prisma } = require('../_prisma');
const { readJson, sendJson, getOrigin } = require('../_http');
const { cleanEmail, issueSubscriptionTokens } = require('../_web-subscriptions');
const { sendSubscriptionEmail } = require('../_subscription-email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const email = cleanEmail(body.email);
  if (!email) return sendJson(res, 400, { error: 'Enter a valid purchase email' });

  try {
    const subscription = await prisma.webSubscription.findFirst({
      where: {
        email,
        status: { in: ['authenticated', 'active', 'past_due', 'cancelled'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (subscription) {
      const tokens = await issueSubscriptionTokens(subscription.id);
      await sendSubscriptionEmail('recovery', tokens.subscription, getOrigin(req), tokens);
    }
  } catch (_error) {
    // Recovery responses stay generic so an address cannot be enumerated.
  }

  return sendJson(res, 200, { ok: true });
};
