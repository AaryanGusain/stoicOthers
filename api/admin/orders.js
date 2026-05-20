const { prisma } = require('../_prisma');
const { requireAdmin, sendJson } = require('../_http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const orders = await prisma.digitalOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      payments: true,
      refunds: true
    }
  });

  return sendJson(res, 200, {
    orders: orders.map(order => ({
      id: order.id,
      product: order.productName,
      email: order.customerEmail,
      declared_country: order.declaredCountry,
      ip_country: order.ipCountry,
      country_mismatch: order.countryMismatch,
      currency: order.currency,
      gross_amount: order.grossAmount,
      checkout_adjustment: order.taxAmountIfAny,
      status: order.status,
      payment_method: order.paymentMethod,
      delivery_status: order.deliveryStatus,
      created_at: order.createdAt,
      paid_at: order.paidAt,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId
    }))
  });
};
