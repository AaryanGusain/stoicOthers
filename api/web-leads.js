const { prisma } = require('./_prisma');
const { readJson, sendJson, getClientIp } = require('./_http');
const { cleanEmail, cleanString, cleanObject } = require('./_web-subscriptions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJson(req);
  const email = cleanEmail(body.email);
  const sessionId = cleanString(body.session_id, 160);
  if (!email || !sessionId) {
    return sendJson(res, 400, { error: 'A valid email and session_id are required' });
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
    return sendJson(res, 200, { ok: true, lead_id: lead.id });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Could not save this plan',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
