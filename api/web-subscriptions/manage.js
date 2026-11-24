const { readJson, sendJson } = require('../_http');
const { cleanString, findSubscriptionByManageToken } = require('../_web-subscriptions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const token = cleanString(body.manage_token, 300);
  const subscription = await findSubscriptionByManageToken(token);
  if (
    !subscription ||
    !subscription.manageTokenExpiresAt ||
    subscription.manageTokenExpiresAt <= new Date()
  ) {
    return sendJson(res, 401, { error: 'This management link is invalid or expired' });
  }

  return sendJson(res, 200, {
    plan: subscription.plan,
    status: subscription.status,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    current_period_end: subscription.currentPeriodEnd
  });
};
