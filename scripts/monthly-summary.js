const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function monthBounds(month) {
  const [year, index] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, index - 1, 1));
  const end = new Date(Date.UTC(year, index, 1));
  return { start, end };
}

function defaultMonth() {
  const now = new Date();
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return previous.toISOString().slice(0, 7);
}

function add(map, key, amount) {
  map[key] = (map[key] || 0) + amount;
}

async function main() {
  const month = process.argv[2] || process.env.SUMMARY_MONTH || defaultMonth();
  const { start, end } = monthBounds(month);
  const inrPerUsd = process.env.USD_INR_RATE ? Number(process.env.USD_INR_RATE) : null;

  const orders = await prisma.digitalOrder.findMany({
    where: {
      status: { in: ['paid', 'refunded', 'partially_refunded'] },
      paidAt: {
        gte: start,
        lt: end
      }
    },
    include: {
      payments: true,
      refunds: true
    }
  });

  const grossByCurrency = {};
  const buyerCountries = {};
  const topTrafficSources = {};
  let fees = 0;
  let refunds = 0;
  let netRevenue = 0;
  let grossInrEstimated = 0;
  let internationalSalesCount = 0;
  let indiaSalesCount = 0;

  orders.forEach(order => {
    add(grossByCurrency, order.currency, order.grossAmount);
    add(buyerCountries, order.declaredCountry || 'Unknown', 1);
    add(topTrafficSources, order.utmSource || 'direct', 1);

    if (order.declaredCountry === 'IN') indiaSalesCount += 1;
    else internationalSalesCount += 1;

    if (order.currency === 'INR') grossInrEstimated += order.grossAmount;
    if (order.currency === 'USD' && inrPerUsd) grossInrEstimated += Math.round(order.grossAmount * inrPerUsd);

    order.payments.forEach(payment => {
      fees += Number(payment.fee || 0);
    });
    order.refunds.forEach(refund => {
      refunds += Number(refund.amount || 0);
    });
  });

  Object.values(grossByCurrency).forEach(amount => {
    netRevenue += amount;
  });
  netRevenue -= fees + refunds;

  const summary = await prisma.monthlySummary.upsert({
    where: { month },
    update: {
      grossByCurrency,
      grossInrEstimated: grossInrEstimated || null,
      fees,
      refunds,
      netRevenue,
      buyerCountries,
      internationalSalesCount,
      indiaSalesCount,
      topTrafficSources
    },
    create: {
      month,
      grossByCurrency,
      grossInrEstimated: grossInrEstimated || null,
      fees,
      refunds,
      netRevenue,
      buyerCountries,
      internationalSalesCount,
      indiaSalesCount,
      topTrafficSources
    }
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
