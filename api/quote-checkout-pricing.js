const { PRODUCTS } = require('./_products');
const { computeCheckoutPricing } = require('./_pricing');
const { readJson, sendJson } = require('./_http');

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizeCountry(value) {
  const country = cleanString(value, 2);
  return country ? country.toUpperCase() : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const productId = cleanString(body.product_id || body.product, 80);
  const declaredCountry = normalizeCountry(body.declared_country);
  const product = PRODUCTS[productId];

  if (!product) {
    return sendJson(res, 400, { error: 'Unknown product' });
  }

  if (!declaredCountry || !/^[A-Z]{2}$/.test(declaredCountry)) {
    return sendJson(res, 400, { error: 'declared_country must be an ISO 2-letter country code' });
  }

  const useInr = declaredCountry === 'IN';
  const pricing = computeCheckoutPricing({
    baseAmount: useInr ? product.inrAmount : product.usdAmount,
    currency: useInr ? 'INR' : 'USD',
    declaredCountry
  });

  return sendJson(res, 200, {
    product_id: productId,
    product_name: product.name,
    amount: pricing.finalAmount,
    currency: pricing.currency,
    pricing_breakdown: pricing.breakdown
  });
};
