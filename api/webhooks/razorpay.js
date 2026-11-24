const crypto = require('crypto');
const { prisma } = require('../_prisma');
const { verifyWebhookSignature } = require('../_razorpay');
const { markOrderPaidAndDeliver, saveRazorpayPayment } = require('../_orders');
const { readRawBody, sendJson, getOrigin } = require('../_http');
const {
  issueSubscriptionTokens,
  laterDate,
  periodDates,
  resolveSubscriptionStatus,
  syncEntitlementForSubscription,
  syncRazorpaySubscriptionEntity,
  upsertSubscriptionPayment
} = require('../_web-subscriptions');
const { sendSubscriptionEmail } = require('../_subscription-email');

module.exports.config = {
  api: {
    bodyParser: false
  }
};

function stableEventId(req, payload, rawText) {
  const headerId = req.headers['x-razorpay-event-id'];
  if (typeof headerId === 'string' && headerId.trim()) return headerId.trim();

  const entity =
    payload && payload.payload && payload.payload.payment && payload.payload.payment.entity ||
    payload && payload.payload && payload.payload.refund && payload.payload.refund.entity ||
    payload && payload.payload && payload.payload.subscription && payload.payload.subscription.entity ||
    payload && payload.payload && payload.payload.order && payload.payload.order.entity ||
    {};

  const key = [payload.event, entity.id, entity.status, entity.created_at].filter(Boolean).join(':');
  return key || crypto.createHash('sha256').update(rawText).digest('hex');
}

async function findWebSubscription(subscriptionId) {
  if (!subscriptionId) return null;
  return prisma.webSubscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionId }
  });
}

async function processSubscriptionPayment(payment, eventName, subscriptionEntity, req) {
  if (!payment || !payment.subscription_id) return null;
  let subscription = await findWebSubscription(payment.subscription_id);
  if (!subscription) return null;

  if (subscriptionEntity) {
    subscription = await syncRazorpaySubscriptionEntity(subscriptionEntity, {
      fromWebhook: true,
      allowPeriodFallback: payment.status === 'captured'
    });
  }
  const period = subscriptionEntity
    ? periodDates(subscriptionEntity, subscription.plan, payment.status === 'captured')
    : { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };
  await upsertSubscriptionPayment(subscription, payment, period);

  const captured = payment.status === 'captured' || payment.captured === true;
  const paidTermStillActive = subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date();
  const incomingStatus = captured
    ? 'active'
    : eventName === 'payment.failed'
      ? (paidTermStillActive ? subscription.status : 'past_due')
      : subscription.status;
  const advancesPeriod = !subscription.currentPeriodEnd || (period.end && period.end >= subscription.currentPeriodEnd);
  subscription = await prisma.webSubscription.update({
    where: { id: subscription.id },
    data: {
      latestPaymentId: payment.id,
      currentPeriodStart: advancesPeriod ? (period.start || subscription.currentPeriodStart) : subscription.currentPeriodStart,
      currentPeriodEnd: laterDate(subscription.currentPeriodEnd, period.end),
      status: resolveSubscriptionStatus(subscription.status, incomingStatus),
      lastWebhookAt: new Date()
    }
  });
  subscription = await syncEntitlementForSubscription(subscription);

  if (captured && !subscription.claimedAt && !subscription.claimTokenHash) {
    const tokens = await issueSubscriptionTokens(subscription.id);
    sendSubscriptionEmail('activation', tokens.subscription, getOrigin(req), tokens).catch(() => undefined);
    subscription = tokens.subscription;
  }
  if (eventName === 'payment.failed') {
    sendSubscriptionEmail('payment_failed', subscription, getOrigin(req)).catch(() => undefined);
  }
  return subscription;
}

async function processSubscriptionEvent(event, req) {
  const subscriptionEntity = event.payload && event.payload.subscription && event.payload.subscription.entity;
  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!subscriptionEntity || !subscriptionEntity.id) return false;

  let subscription = await syncRazorpaySubscriptionEntity(subscriptionEntity, {
    fromWebhook: true,
    allowPeriodFallback: event.event === 'subscription.charged' || event.event === 'subscription.activated'
  });
  if (!subscription) return true;

  if (payment) {
    subscription = await processSubscriptionPayment(payment, event.event, subscriptionEntity, req) || subscription;
  }

  if (event.event === 'subscription.cancelled') {
    sendSubscriptionEmail('cancelled', subscription, getOrigin(req)).catch(() => undefined);
  }
  if (event.event === 'subscription.pending' || event.event === 'subscription.halted') {
    sendSubscriptionEmail('payment_failed', subscription, getOrigin(req)).catch(() => undefined);
  }
  return true;
}

async function upsertRefund(refund) {
  const paymentId = refund.payment_id || null;
  const payment = paymentId
    ? await prisma.razorpayPayment.findUnique({ where: { razorpayPaymentId: paymentId } })
    : null;
  const orderId = payment ? payment.digitalOrderId : null;

  await prisma.refund.upsert({
    where: { razorpayRefundId: refund.id },
    update: {
      digitalOrderId: orderId || undefined,
      razorpayPaymentId: paymentId,
      amount: Number(refund.amount || 0),
      currency: refund.currency || null,
      status: refund.status || null,
      rawPayloadJson: refund
    },
    create: {
      digitalOrderId: orderId,
      razorpayRefundId: refund.id,
      razorpayPaymentId: paymentId,
      amount: Number(refund.amount || 0),
      currency: refund.currency || null,
      status: refund.status || null,
      rawPayloadJson: refund
    }
  });

  if (orderId) {
    const order = await prisma.digitalOrder.findUnique({
      where: { id: orderId },
      include: { refunds: true }
    });
    if (order) {
      const refundedAmount = order.refunds.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      await prisma.digitalOrder.update({
        where: { id: order.id },
        data: {
          status: refundedAmount >= order.grossAmount ? 'refunded' : 'partially_refunded'
        }
      });
    }
  }
}

async function processWebhook(event, req) {
  if (event.event && event.event.startsWith('subscription.')) {
    await processSubscriptionEvent(event, req);
    return;
  }

  if (event.event === 'payment.captured') {
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (!payment) return;

    if (payment.subscription_id) {
      const subscriptionEntity = event.payload && event.payload.subscription && event.payload.subscription.entity;
      await processSubscriptionPayment(payment, event.event, subscriptionEntity, req);
      return;
    }

    const order = await prisma.digitalOrder.findUnique({
      where: { razorpayOrderId: payment.order_id }
    });

    if (!order) {
      await saveRazorpayPayment({ order: null, payment, signatureVerified: true });
      return;
    }

    await markOrderPaidAndDeliver({
      order,
      payment,
      signatureVerified: true,
      origin: getOrigin(req)
    });
    return;
  }

  if (event.event === 'payment.failed') {
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (!payment) return;

    if (payment.subscription_id) {
      const subscriptionEntity = event.payload && event.payload.subscription && event.payload.subscription.entity;
      await processSubscriptionPayment(payment, event.event, subscriptionEntity, req);
      return;
    }

    const order = await prisma.digitalOrder.findUnique({
      where: { razorpayOrderId: payment.order_id }
    });
    await saveRazorpayPayment({ order, payment, signatureVerified: true });

    if (order && order.status === 'created') {
      await prisma.digitalOrder.update({
        where: { id: order.id },
        data: {
          status: 'failed',
          razorpayPaymentId: payment.id,
          paymentMethod: payment.method || null
        }
      });
    }
    return;
  }

  if (event.event === 'refund.created' || event.event === 'refund.processed') {
    const refund = event.payload && event.payload.refund && event.payload.refund.entity;
    if (refund) {
      const webPayment = refund.payment_id
        ? await prisma.webSubscriptionPayment.findUnique({
            where: { razorpayPaymentId: refund.payment_id },
            include: { webSubscription: true }
          })
        : null;
      if (webPayment && Number(refund.amount || 0) >= webPayment.amount) {
        const subscription = await prisma.webSubscription.update({
          where: { id: webPayment.webSubscriptionId },
          data: { status: 'refunded', lastWebhookAt: new Date() }
        });
        await syncEntitlementForSubscription(subscription);
      }
      await upsertRefund(refund);
    }
    return;
  }

  if (event.event === 'order.paid') {
    const orderEntity = event.payload && event.payload.order && event.payload.order.entity;
    if (!orderEntity || !orderEntity.id) return;

    const order = await prisma.digitalOrder.findUnique({
      where: { razorpayOrderId: orderEntity.id }
    });
    if (order && order.status === 'created') {
      await prisma.digitalOrder.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          paidAt: new Date()
        }
      });
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const raw = await readRawBody(req);
  const rawText = raw.toString('utf8');
  const signature = req.headers['x-razorpay-signature'];
  const signatureVerified = typeof signature === 'string' && verifyWebhookSignature(rawText, signature);

  if (!signatureVerified) {
    return sendJson(res, 400, { error: 'Invalid webhook signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch (_error) {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const providerEventId = stableEventId(req, payload, rawText);

  try {
    const webhook = await prisma.webhookEvent.create({
      data: {
        providerEventId,
        event: payload.event || 'unknown',
        signatureVerified,
        rawPayloadJson: payload
      }
    });

    await processWebhook(payload, req);

    await prisma.webhookEvent.update({
      where: { id: webhook.id },
      data: { processedAt: new Date() }
    });

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    if (error && error.code === 'P2002') {
      return sendJson(res, 200, { ok: true, duplicate: true });
    }

    return sendJson(res, 500, {
      error: 'Webhook processing failed',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
