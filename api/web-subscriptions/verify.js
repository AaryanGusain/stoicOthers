const { prisma } = require('../_prisma');
const {
  fetchPayment,
  fetchRazorpaySubscription,
  verifySubscriptionCheckoutSignature
} = require('../_razorpay');
const { readJson, sendJson, getOrigin } = require('../_http');
const {
  cleanString,
  laterDate,
  periodDates,
  resolveSubscriptionStatus,
  syncRazorpaySubscriptionEntity,
  upsertSubscriptionPayment,
  issueSubscriptionTokens
} = require('../_web-subscriptions');
const { sendSubscriptionEmail } = require('../_subscription-email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const localId = cleanString(body.local_subscription_id, 160);
  const paymentId = cleanString(body.razorpay_payment_id, 160);
  const subscriptionId = cleanString(body.razorpay_subscription_id, 160);
  const signature = cleanString(body.razorpay_signature, 300);
  if (!localId || !paymentId || !subscriptionId || !signature) {
    return sendJson(res, 400, { error: 'Payment confirmation details are incomplete' });
  }

  if (!verifySubscriptionCheckoutSignature({ subscriptionId, paymentId, signature })) {
    return sendJson(res, 400, { error: 'Invalid payment signature' });
  }

  try {
    const local = await prisma.webSubscription.findUnique({ where: { id: localId } });
    if (!local || local.razorpaySubscriptionId !== subscriptionId) {
      return sendJson(res, 404, { error: 'Subscription not found' });
    }

    const [payment, gatewaySubscription] = await Promise.all([
      fetchPayment(paymentId),
      fetchRazorpaySubscription(subscriptionId)
    ]);
    if (payment.subscription_id !== subscriptionId) {
      return sendJson(res, 400, { error: 'Payment does not belong to this subscription' });
    }
    if (payment.status !== 'captured' && payment.captured !== true) {
      return sendJson(res, 409, {
        error: 'Payment is still being confirmed',
        message: 'Payment is still being confirmed. We will email your activation link as soon as it settles.'
      });
    }

    let subscription = await syncRazorpaySubscriptionEntity(gatewaySubscription, {
      allowPeriodFallback: true
    });
    const period = periodDates(gatewaySubscription, subscription.plan, true);
    await upsertSubscriptionPayment(subscription, payment, period);
    const advancesPeriod = !subscription.currentPeriodEnd || (period.end && period.end >= subscription.currentPeriodEnd);
    const incomingStatus = gatewaySubscription.status === 'active' ? 'active' : 'authenticated';
    subscription = await prisma.webSubscription.update({
      where: { id: subscription.id },
      data: {
        latestPaymentId: payment.id,
        currentPeriodStart: advancesPeriod ? (period.start || subscription.currentPeriodStart) : subscription.currentPeriodStart,
        currentPeriodEnd: laterDate(subscription.currentPeriodEnd, period.end),
        status: resolveSubscriptionStatus(subscription.status, incomingStatus)
      }
    });

    const tokens = await issueSubscriptionTokens(subscription.id);
    sendSubscriptionEmail('activation', tokens.subscription, getOrigin(req), tokens).catch(() => undefined);

    return sendJson(res, 200, {
      ok: true,
      status: tokens.subscription.status,
      current_period_end: tokens.subscription.currentPeriodEnd,
      claim_token: tokens.claimToken,
      manage_token: tokens.manageToken
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: 'Payment confirmation failed',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
