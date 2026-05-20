const { prisma } = require('./_prisma');
const { sendDeliveryEmail } = require('./_delivery');

function normalizePayment(payment) {
  const card = payment && payment.card ? payment.card : {};

  return {
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id || null,
    amount: Number(payment.amount || 0),
    currency: payment.currency || 'USD',
    fee: payment.fee === undefined || payment.fee === null ? null : Number(payment.fee),
    tax: payment.tax === undefined || payment.tax === null ? null : Number(payment.tax),
    method: payment.method || null,
    cardNetwork: card.network || null,
    cardIssuer: card.issuer || null,
    cardInternational: typeof card.international === 'boolean' ? card.international : (typeof payment.international === 'boolean' ? payment.international : null),
    captured: typeof payment.captured === 'boolean' ? payment.captured : null,
    status: payment.status || null,
    rawPayloadJson: payment
  };
}

async function saveRazorpayPayment({ order, payment, signatureVerified }) {
  const normalized = normalizePayment(payment);

  return prisma.razorpayPayment.upsert({
    where: { razorpayPaymentId: normalized.razorpayPaymentId },
    update: {
      digitalOrderId: order ? order.id : undefined,
      razorpayOrderId: normalized.razorpayOrderId,
      razorpaySignatureVerified: signatureVerified,
      amount: normalized.amount,
      currency: normalized.currency,
      fee: normalized.fee,
      tax: normalized.tax,
      method: normalized.method,
      cardNetwork: normalized.cardNetwork,
      cardIssuer: normalized.cardIssuer,
      cardInternational: normalized.cardInternational,
      captured: normalized.captured,
      status: normalized.status,
      rawPayloadJson: normalized.rawPayloadJson
    },
    create: {
      digitalOrderId: order ? order.id : null,
      razorpayPaymentId: normalized.razorpayPaymentId,
      razorpayOrderId: normalized.razorpayOrderId,
      razorpaySignatureVerified: signatureVerified,
      amount: normalized.amount,
      currency: normalized.currency,
      fee: normalized.fee,
      tax: normalized.tax,
      method: normalized.method,
      cardNetwork: normalized.cardNetwork,
      cardIssuer: normalized.cardIssuer,
      cardInternational: normalized.cardInternational,
      captured: normalized.captured,
      status: normalized.status,
      rawPayloadJson: normalized.rawPayloadJson
    }
  });
}

async function markOrderPaidAndDeliver({ order, payment, origin, signatureVerified = true }) {
  const amountMatches = Number(payment.amount || 0) === Number(order.grossAmount || 0);
  const currencyMatches = String(payment.currency || '').toUpperCase() === String(order.currency || '').toUpperCase();
  const captured = payment.status === 'captured' || payment.captured === true;

  await saveRazorpayPayment({ order, payment, signatureVerified });

  if (!signatureVerified || !amountMatches || !currencyMatches || !captured) {
    return {
      paid: false,
      reason: !signatureVerified ? 'signature_invalid' : (!amountMatches ? 'amount_mismatch' : (!currencyMatches ? 'currency_mismatch' : 'payment_not_captured'))
    };
  }

  const updated = await prisma.digitalOrder.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      razorpayPaymentId: payment.id,
      paymentMethod: payment.method || null,
      paymentInternational: typeof payment.international === 'boolean' ? payment.international : null,
      paidAt: order.paidAt || new Date()
    }
  });

  try {
    await sendDeliveryEmail(updated, origin);
  } catch (_error) {
    return { paid: true, delivery: 'failed' };
  }

  return { paid: true, delivery: 'sent_or_skipped' };
}

module.exports = {
  normalizePayment,
  saveRazorpayPayment,
  markOrderPaidAndDeliver
};
