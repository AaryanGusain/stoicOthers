const { prisma } = require('../_prisma');
const { createRazorpaySubscription } = require('../_razorpay');
const { readJson, sendJson, getClientIp } = require('../_http');
const {
  cleanEmail,
  cleanString,
  cleanObject,
  getPlanConfig
} = require('../_web-subscriptions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const email = cleanEmail(body.email);
  const sessionId = cleanString(body.session_id, 160);
  const plan = cleanString(body.plan, 20);
  if (!email || !sessionId) {
    return sendJson(res, 400, { error: 'A valid email and session_id are required' });
  }

  let planConfig;
  try {
    planConfig = getPlanConfig(plan);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }

  try {
    const lead = await prisma.webLead.upsert({
      where: { sessionId },
      update: {
        email,
        marketingConsent: body.marketing_consent === true,
        answersJson: cleanObject(body.answers),
        attributionJson: cleanObject(body.attribution),
        referrer: cleanString(body.referrer || req.headers.referer, 1000),
        ipAddress: getClientIp(req),
        ipCountry: cleanString(req.headers['x-vercel-ip-country'], 2),
        userAgent: cleanString(req.headers['user-agent'], 1000)
      },
      create: {
        email,
        sessionId,
        marketingConsent: body.marketing_consent === true,
        answersJson: cleanObject(body.answers),
        attributionJson: cleanObject(body.attribution),
        referrer: cleanString(body.referrer || req.headers.referer, 1000),
        ipAddress: getClientIp(req),
        ipCountry: cleanString(req.headers['x-vercel-ip-country'], 2),
        userAgent: cleanString(req.headers['user-agent'], 1000)
      }
    });

    const activeExisting = await prisma.webSubscription.findFirst({
      where: {
        leadId: lead.id,
        status: { in: ['authenticated', 'active', 'past_due', 'cancelled'] },
        currentPeriodEnd: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (activeExisting) {
      return sendJson(res, 409, {
        error: 'This email already has an active web subscription',
        manage_url: '/funnel/manage'
      });
    }

    const recentCreated = await prisma.webSubscription.findFirst({
      where: {
        leadId: lead.id,
        plan,
        status: 'created',
        razorpaySubscriptionId: { not: null },
        createdAt: { gt: new Date(Date.now() - 20 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentCreated) {
      return sendJson(res, 200, {
        local_subscription_id: recentCreated.id,
        razorpay_subscription_id: recentCreated.razorpaySubscriptionId,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: recentCreated.amount,
        currency: recentCreated.currency,
        plan: recentCreated.plan
      });
    }

    const local = await prisma.webSubscription.create({
      data: {
        leadId: lead.id,
        email,
        plan,
        amount: planConfig.amount,
        currency: 'USD',
        razorpayPlanId: planConfig.planId,
        status: 'created'
      }
    });

    try {
      const gateway = await createRazorpaySubscription({
        plan_id: planConfig.planId,
        total_count: planConfig.totalCount,
        quantity: 1,
        customer_notify: 0,
        notes: {
          local_subscription_id: local.id,
          funnel_session_id: sessionId,
          plan,
          purchase_email: email
        }
      });

      await prisma.webSubscription.update({
        where: { id: local.id },
        data: {
          razorpaySubscriptionId: gateway.id,
          razorpayCustomerId: gateway.customer_id || null,
          rawPayloadJson: gateway
        }
      });

      return sendJson(res, 200, {
        local_subscription_id: local.id,
        razorpay_subscription_id: gateway.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: planConfig.amount,
        currency: 'USD',
        plan
      });
    } catch (error) {
      await prisma.webSubscription.delete({ where: { id: local.id } }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: 'Could not create the subscription',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
