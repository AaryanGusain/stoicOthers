const crypto = require('crypto');

function assertRazorpayConfigured() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay is not configured');
    error.statusCode = 500;
    throw error;
  }
}

async function razorpayRequest(path, options = {}) {
  assertRazorpayConfigured();

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_error) {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body && body.error && body.error.description ? body.error.description : 'Razorpay request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function createRazorpayOrder(payload) {
  return razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function fetchPayment(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

function createRazorpaySubscription(payload) {
  return razorpayRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function fetchRazorpaySubscription(subscriptionId) {
  return razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

function cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd = true) {
  return razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 })
  });
}

function hmacSha256(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = hmacSha256(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
  return safeCompare(expected, signature);
}

function verifySubscriptionCheckoutSignature({ subscriptionId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = hmacSha256(
    `${paymentId}|${subscriptionId}`,
    process.env.RAZORPAY_KEY_SECRET
  );
  return safeCompare(expected, signature);
}

function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = hmacSha256(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET);
  return safeCompare(expected, signature);
}

module.exports = {
  createRazorpayOrder,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  cancelRazorpaySubscription,
  fetchPayment,
  verifyCheckoutSignature,
  verifySubscriptionCheckoutSignature,
  verifyWebhookSignature
};
