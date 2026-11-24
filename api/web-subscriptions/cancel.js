const { prisma } = require('../_prisma');
const { cancelRazorpaySubscription } = require('../_razorpay');
const { readJson, sendJson, getOrigin } = require('../_http');
const {
  cleanString,
  findSubscriptionByManageToken,
  syncRazorpaySubscriptionEntity
} = require('../_web-subscriptions');
const { sendSubscriptionEmail } = require('../_subscription-email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const token = cleanString(body.manage_token, 300);
  let subscription = await findSubscriptionByManageToken(token);
  if (
    !subscription ||
    !subscription.manageTokenExpiresAt ||
    subscription.manageTokenExpiresAt <= new Date()
  ) {
    return sendJson(res, 401, { error: 'This management link is invalid or expired' });
  }
  if (!subscription.razorpaySubscriptionId) {
    return sendJson(res, 409, { error: 'This subscription is not ready to manage' });
  }
  if (subscription.cancelAtPeriodEnd) {
    return sendJson(res, 200, {
      ok: true,
      cancel_at_period_end: true,
      current_period_end: subscription.currentPeriodEnd
    });
  }

  try {
    const entity = await cancelRazorpaySubscription(subscription.razorpaySubscriptionId, true);
    subscription = await syncRazorpaySubscriptionEntity(entity);
    subscription = await prisma.webSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: subscription.cancelledAt || new Date()
      }
    });
    sendSubscriptionEmail('cancelled', subscription, getOrigin(req), { manageToken: token }).catch(() => undefined);
    return sendJson(res, 200, {
      ok: true,
      cancel_at_period_end: true,
      current_period_end: subscription.currentPeriodEnd
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: 'Could not cancel the renewal',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
