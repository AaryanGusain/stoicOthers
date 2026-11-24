const { prisma } = require('../_prisma');
const { readJson, sendJson } = require('../_http');
const { verifyFirebaseBearerToken } = require('../_firebase-admin');
const {
  cleanString,
  findSubscriptionByClaimToken,
  refreshSubscriptionFromRazorpay,
  isAccessStatus,
  syncEntitlementForSubscription
} = require('../_web-subscriptions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const decoded = await verifyFirebaseBearerToken(req);
    const body = await readJson(req);
    const claimToken = cleanString(body.claim_token, 300);
    if (!claimToken) return sendJson(res, 400, { error: 'A claim token is required' });

    let subscription = await findSubscriptionByClaimToken(claimToken);
    if (!subscription) return sendJson(res, 404, { error: 'This activation link is invalid or has already been used' });
    if (!subscription.claimTokenExpiresAt || subscription.claimTokenExpiresAt <= new Date()) {
      return sendJson(res, 410, { error: 'This activation link has expired. Request a new link from the subscription page.' });
    }
    if (subscription.firebaseUid && subscription.firebaseUid !== decoded.uid) {
      return sendJson(res, 409, { error: 'This subscription is already connected to another Stoic Widgets account' });
    }

    subscription = await refreshSubscriptionFromRazorpay(subscription, {
      allowPeriodFallback: true
    });
    const hasPaidTime = subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date();
    if (!isAccessStatus(subscription.status) || !hasPaidTime) {
      return sendJson(res, 409, { error: 'The subscription is not active yet. Wait for the payment confirmation email and try again.' });
    }

    subscription = await prisma.webSubscription.update({
      where: { id: subscription.id },
      data: {
        firebaseUid: decoded.uid,
        revenueCatAppUserId: decoded.uid
      }
    });

    subscription = await syncEntitlementForSubscription(subscription);
    subscription = await prisma.webSubscription.update({
      where: { id: subscription.id },
      data: {
        claimTokenHash: null,
        claimTokenExpiresAt: null,
        claimedAt: subscription.claimedAt || new Date()
      }
    });

    return sendJson(res, 200, {
      ok: true,
      plan: subscription.plan,
      status: subscription.status,
      current_period_end: subscription.currentPeriodEnd,
      entitlement: 'StoicismWidget Pro'
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: 'Could not activate Stoic Widgets Pro',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
