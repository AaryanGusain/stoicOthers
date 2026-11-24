const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';
const ENTITLEMENT_ID = 'StoicismWidget Pro';

function assertRevenueCatConfigured() {
  if (!process.env.REVENUECAT_SECRET_API_KEY) {
    const error = new Error('RevenueCat server access is not configured');
    error.statusCode = 503;
    throw error;
  }
}

async function revenueCatRequest(path, options = {}) {
  assertRevenueCatConfigured();
  const response = await fetch(`${REVENUECAT_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_error) {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body && body.message ? body.message : 'RevenueCat request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function grantStoicProEntitlement(appUserId, endsAt) {
  if (!appUserId || !(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
    throw new Error('A valid RevenueCat user and entitlement end date are required');
  }

  return revenueCatRequest(
    `/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(ENTITLEMENT_ID)}/promotional`,
    {
      method: 'POST',
      body: JSON.stringify({ end_time_ms: endsAt.getTime() })
    }
  );
}

async function revokeStoicProEntitlement(appUserId) {
  if (!appUserId) return null;
  return revenueCatRequest(
    `/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(ENTITLEMENT_ID)}/revoke_promotionals`,
    { method: 'POST', body: '{}' }
  );
}

module.exports = {
  ENTITLEMENT_ID,
  grantStoicProEntitlement,
  revokeStoicProEntitlement
};
