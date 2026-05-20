const crypto = require('crypto');
const { prisma } = require('../_prisma');
const { verifyWebhookSignature } = require('../_razorpay');
const { markOrderPaidAndDeliver, saveRazorpayPayment } = require('../_orders');
const { readRawBody, sendJson, getOrigin } = require('../_http');

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
    payload && payload.payload && payload.payload.order && payload.payload.order.entity ||
    {};

  const key = [payload.event, entity.id, entity.status, entity.created_at].filter(Boolean).join(':');
  return key || crypto.createHash('sha256').update(rawText).digest('hex');
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
  if (event.event === 'payment.captured') {
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (!payment) return;

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
    if (refund) await upsertRefund(refund);
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
