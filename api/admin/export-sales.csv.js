const { prisma } = require('../_prisma');
const { requireAdmin, csvEscape } = require('../_http');

function cents(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

function firstPayment(order) {
  return order.payments.find(payment => payment.razorpayPaymentId === order.razorpayPaymentId) || order.payments[0] || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  if (!requireAdmin(req, res)) return;

  const orders = await prisma.digitalOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      payments: true,
      refunds: true
    }
  });

  const headers = [
    'Date',
    'Local Order ID',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Customer Email',
    'Customer Name',
    'Declared Country',
    'Declared State/Region',
    'IP Country',
    'Country Mismatch',
    'Product',
    'Currency',
    'Gross Amount',
    'Checkout Taxes & Processing',
    'Razorpay Fee',
    'Razorpay Tax/GST on Fee',
    'Net Amount',
    'Payment Method',
    'Card Network',
    'Card Issuer',
    'Card International',
    'Status',
    'Refund Amount',
    'Payout ID',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Referrer',
    'Notes'
  ];

  const rows = orders.map(order => {
    const payment = firstPayment(order);
    const refundAmount = order.refunds.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const net = Number(order.grossAmount || 0) - Number(payment.fee || 0) - refundAmount;
    return [
      (order.paidAt || order.createdAt).toISOString(),
      order.id,
      order.razorpayOrderId,
      order.razorpayPaymentId,
      order.customerEmail,
      order.customerName,
      order.declaredCountry,
      order.declaredStateRegion,
      order.ipCountry,
      order.countryMismatch ? 'yes' : 'no',
      order.productName,
      order.currency,
      cents(order.grossAmount),
      cents(order.taxAmountIfAny),
      cents(payment.fee),
      cents(payment.tax),
      cents(net),
      payment.method || order.paymentMethod,
      payment.cardNetwork,
      payment.cardIssuer,
      payment.cardInternational === null || payment.cardInternational === undefined ? '' : String(payment.cardInternational),
      order.status,
      cents(refundAmount),
      '',
      order.utmSource,
      order.utmMedium,
      order.utmCampaign,
      order.referrer,
      JSON.stringify(order.notesJson || {})
    ].map(csvEscape).join(',');
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="stoic-meditations-sales.csv"');
  res.end([headers.map(csvEscape).join(','), ...rows].join('\n'));
};
