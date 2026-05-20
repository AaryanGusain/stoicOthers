const { prisma } = require('../_prisma');
const { requireAdmin, sendJson } = require('../_http');

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function add(map, key, amount) {
  map[key] = (map[key] || 0) + amount;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const orders = await prisma.digitalOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { payments: true, refunds: true }
  });

  const paid = orders.filter(order => order.status === 'paid' || order.status === 'refunded' || order.status === 'partially_refunded');
  const salesByCountry = {};
  const salesByMonth = {};
  const grossByCurrency = {};
  const failedPayments = orders.filter(order => order.status === 'failed').length;
  const mismatchFlags = orders.filter(order => order.countryMismatch).length;
  let totalGross = 0;
  let totalNetEstimated = 0;
  let checkoutAdjustments = 0;
  let refunds = 0;
  let indiaSales = 0;
  let internationalSales = 0;

  paid.forEach(order => {
    totalGross += order.grossAmount;
    totalNetEstimated += order.netAmountEstimated;
    checkoutAdjustments += order.taxAmountIfAny;
    add(grossByCurrency, order.currency, order.grossAmount);
    add(salesByCountry, order.declaredCountry || 'Unknown', order.grossAmount);
    add(salesByMonth, monthKey(order.paidAt || order.createdAt), order.grossAmount);
    if (order.declaredCountry === 'IN') indiaSales += 1;
    else internationalSales += 1;
    order.refunds.forEach(refund => { refunds += refund.amount; });
  });

  return sendJson(res, 200, {
    totals: {
      gross: totalGross,
      net_estimated: totalNetEstimated,
      checkout_adjustments: checkoutAdjustments,
      refunds,
      failed_payments: failedPayments,
      country_mismatch_flags: mismatchFlags,
      paid_orders: paid.length,
      created_orders: orders.filter(order => order.status === 'created').length
    },
    gross_by_currency: grossByCurrency,
    sales_by_country: salesByCountry,
    sales_by_month: salesByMonth,
    split: {
      india_sales: indiaSales,
      international_sales: internationalSales
    }
  });
};
