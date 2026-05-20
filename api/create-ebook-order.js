const { prisma } = require('./_prisma');
const { PRODUCTS } = require('./_products');
const { createRazorpayOrder } = require('./_razorpay');
const { readJson, sendJson, getClientIp } = require('./_http');
const { computeCheckoutPricing } = require('./_pricing');

const STATE_REQUIRED_COUNTRIES = new Set(['US', 'CA', 'IN']);

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function normalizeCountry(value) {
  const country = cleanString(value, 2);
  return country ? country.toUpperCase() : null;
}

function collectUtm(body) {
  return {
    utmSource: cleanString(body.utm_source, 160),
    utmMedium: cleanString(body.utm_medium, 160),
    utmCampaign: cleanString(body.utm_campaign, 240),
    utmContent: cleanString(body.utm_content, 240),
    utmTerm: cleanString(body.utm_term, 240)
  };
}

async function createGatewayOrder({ localOrder, product, pricing }) {
  return createRazorpayOrder({
    amount: pricing.finalAmount,
    currency: pricing.currency,
    receipt: localOrder.id.slice(0, 40),
    notes: {
      local_order_id: localOrder.id,
      customer_email: localOrder.customerEmail,
      declared_country: localOrder.declaredCountry,
      declared_state_region: localOrder.declaredStateRegion || '',
      product_name: product.name,
      utm_source: localOrder.utmSource || '',
      base_amount: String(pricing.baseAmount),
      taxes_processing_amount: String(pricing.adjustmentAmount)
    }
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const productId = cleanString(body.product_id || body.product, 80);
  const product = PRODUCTS[productId];

  if (!product) {
    return sendJson(res, 400, { error: 'Unknown product' });
  }

  const customerEmail = cleanString(body.customer_email || body.email, 240);
  const customerName = cleanString(body.customer_name || body.name, 240);
  const declaredCountry = normalizeCountry(body.declared_country);
  const declaredStateRegion = cleanString(body.declared_state_region, 120);

  if (!isValidEmail(customerEmail)) {
    return sendJson(res, 400, { error: 'A valid customer_email is required' });
  }

  if (!declaredCountry || !/^[A-Z]{2}$/.test(declaredCountry)) {
    return sendJson(res, 400, { error: 'declared_country must be an ISO 2-letter country code' });
  }

  if (STATE_REQUIRED_COUNTRIES.has(declaredCountry) && !declaredStateRegion) {
    return sendJson(res, 400, { error: 'declared_state_region is required for US, Canada, and India' });
  }

  if (body.consent !== true) {
    return sendJson(res, 400, { error: 'Billing country consent is required' });
  }

  const ipCountryHeader = req.headers['x-vercel-ip-country'];
  const ipCountry = typeof ipCountryHeader === 'string' && ipCountryHeader.length === 2 ? ipCountryHeader.toUpperCase() : null;
  const countryMismatch = Boolean(ipCountry && ipCountry !== declaredCountry);
  const utm = collectUtm(body);
  const ipAddress = getClientIp(req);
  const userAgent = cleanString(req.headers['user-agent'], 1000);
  const browserLocale = cleanString(body.browser_locale, 80);
  const referrer = cleanString(body.referrer || req.headers.referer, 1000);

  try {
    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName || undefined
      },
      create: {
        email: customerEmail,
        name: customerName,
        firstDeclaredCountry: declaredCountry,
        firstIpCountry: ipCountry
      }
    });

    const usdPricing = computeCheckoutPricing({
      baseAmount: product.usdAmount,
      currency: 'USD',
      declaredCountry
    });

    const localOrder = await prisma.digitalOrder.create({
      data: {
        productId,
        productName: product.name,
        customerId: customer.id,
        customerEmail,
        customerName,
        declaredCountry,
        declaredStateRegion,
        ipAddress,
        ipCountry,
        countryMismatch,
        currency: 'USD',
        displayCurrency: 'USD',
        listedPrice: product.listedPrice,
        grossAmount: usdPricing.finalAmount,
        taxAmountIfAny: usdPricing.adjustmentAmount,
        discountAmount: product.discountAmount || 0,
        netAmountEstimated: usdPricing.baseAmount,
        status: 'created',
        notesJson: {
          product_description: product.description,
          marketing_source: cleanString(body.marketing_source, 240),
          checkout_currency_preference: 'USD',
          pricing_breakdown: usdPricing.breakdown
        },
        referrer,
        userAgent,
        browserLocale,
        ...utm
      }
    });

    let gatewayOrder;
    let finalOrder = localOrder;
    let currencyFallback = null;

    try {
      gatewayOrder = await createGatewayOrder({
        localOrder,
        product,
        pricing: usdPricing
      });
    } catch (error) {
      currencyFallback = error && error.message ? error.message : 'USD order creation failed';
      const inrPricing = computeCheckoutPricing({
        baseAmount: product.inrAmount,
        currency: 'INR',
        declaredCountry
      });
      gatewayOrder = await createGatewayOrder({
        localOrder,
        product,
        pricing: inrPricing
      });
      finalOrder = await prisma.digitalOrder.update({
        where: { id: localOrder.id },
        data: {
          currency: 'INR',
          displayCurrency: 'INR',
          listedPrice: (product.inrAmount / 100).toFixed(2),
          grossAmount: inrPricing.finalAmount,
          taxAmountIfAny: inrPricing.adjustmentAmount,
          netAmountEstimated: inrPricing.baseAmount,
          notesJson: {
            ...(localOrder.notesJson || {}),
            checkout_currency_preference: 'USD',
            currency_fallback: currencyFallback,
            pricing_breakdown: inrPricing.breakdown
          }
        }
      });
    }

    await prisma.digitalOrder.update({
      where: { id: finalOrder.id },
      data: {
        razorpayOrderId: gatewayOrder.id
      }
    });

    return sendJson(res, 200, {
      local_order_id: finalOrder.id,
      razorpay_order_id: gatewayOrder.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      product_name: product.name,
      customer_email: customerEmail,
      customer_name: customerName,
      pricing_breakdown: finalOrder.notesJson && finalOrder.notesJson.pricing_breakdown
        ? finalOrder.notesJson.pricing_breakdown
        : usdPricing.breakdown,
      currency_fallback: currencyFallback,
      checkout: {
        name: 'Stoic Meditations',
        description: product.name,
        order_id: gatewayOrder.id,
        prefill: {
          name: customerName || '',
          email: customerEmail
        },
        notes: {
          local_order_id: finalOrder.id,
          product_id: productId
        }
      }
    });
  } catch (error) {
    const status = error && error.statusCode ? error.statusCode : 500;
    return sendJson(res, status, {
      error: 'Could not create Razorpay order',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
