const { prisma } = require('./_prisma');
const { fetchPayment, verifyCheckoutSignature } = require('./_razorpay');
const { markOrderPaidAndDeliver } = require('./_orders');
const { readJson, sendJson, getOrigin } = require('./_http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const razorpayOrderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
  const razorpayPaymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
  const razorpaySignature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return sendJson(res, 400, { error: 'Missing Razorpay verification fields' });
  }

  const signatureVerified = verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature
  });

  if (!signatureVerified) {
    return sendJson(res, 400, { error: 'Invalid Razorpay signature' });
  }

  const order = await prisma.digitalOrder.findUnique({
    where: { razorpayOrderId }
  });

  if (!order) {
    return sendJson(res, 404, { error: 'Local order not found' });
  }

  try {
    const payment = await fetchPayment(razorpayPaymentId);
    const result = await markOrderPaidAndDeliver({
      order,
      payment,
      signatureVerified,
      origin: getOrigin(req)
    });

    if (!result.paid) {
      return sendJson(res, 402, { error: 'Payment could not be marked paid', reason: result.reason });
    }

    return sendJson(res, 200, {
      ok: true,
      local_order_id: order.id,
      delivery: result.delivery
    });
  } catch (error) {
    return sendJson(res, 502, {
      error: 'Payment verification failed',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
