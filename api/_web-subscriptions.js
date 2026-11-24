const crypto = require('crypto');
const { prisma } = require('./_prisma');
const { fetchRazorpaySubscription } = require('./_razorpay');
const { grantStoicProEntitlement, revokeStoicProEntitlement } = require('./_revenuecat');

const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MANAGE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PLAN_CONFIG = {
  weekly: {
    amount: 499,
    planEnv: 'RAZORPAY_STOIC_WEEKLY_PLAN_ID',
    totalCount: 5200,
    fallbackPeriodMs: 7 * 24 * 60 * 60 * 1000
  },
  annual: {
    amount: 4999,
    planEnv: 'RAZORPAY_STOIC_ANNUAL_PLAN_ID',
    totalCount: 100,
    fallbackPeriodMs: 365 * 24 * 60 * 60 * 1000
  }
};

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanEmail(value) {
  const email = cleanString(value, 240);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email.toLowerCase()
    : null;
}

function cleanObject(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => cleanObject(item, depth + 1));
  if (typeof value !== 'object') return null;

  return Object.entries(value).slice(0, 50).reduce((result, [key, item]) => {
    const safeKey = String(key).slice(0, 120);
    result[safeKey] = cleanObject(item, depth + 1);
    return result;
  }, {});
}

function getPlanConfig(plan) {
  const config = PLAN_CONFIG[plan];
  if (!config) {
    const error = new Error('Choose a valid weekly or annual plan');
    error.statusCode = 400;
    throw error;
  }
  if (
    process.env.VERCEL_ENV === 'preview' &&
    (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_'))
  ) {
    const error = new Error('Razorpay Test Mode is required for preview deployments');
    error.statusCode = 503;
    throw error;
  }
  const planId = process.env[config.planEnv];
  if (!planId) {
    const error = new Error(`${config.planEnv} is not configured`);
    error.statusCode = 503;
    throw error;
  }
  return { ...config, planId };
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function makeOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function unixDate(value) {
  const seconds = Number(value || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRazorpayStatus(status) {
  const mapping = {
    created: 'created',
    authenticated: 'authenticated',
    active: 'active',
    pending: 'past_due',
    paused: 'past_due',
    halted: 'halted',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired'
  };
  return mapping[status] || 'created';
}

function isAccessStatus(status) {
  return status === 'active' || status === 'authenticated' || status === 'cancelled';
}

function isTerminalStatus(status) {
  return status === 'halted' || status === 'completed' || status === 'expired' || status === 'refunded';
}

function resolveSubscriptionStatus(currentStatus, incomingStatus) {
  if (!currentStatus) return incomingStatus;
  if (currentStatus === 'refunded') return currentStatus;
  if ((isTerminalStatus(currentStatus) || currentStatus === 'cancelled') &&
      !isTerminalStatus(incomingStatus) && incomingStatus !== 'cancelled') {
    return currentStatus;
  }
  if (currentStatus === 'active' && (incomingStatus === 'created' || incomingStatus === 'authenticated')) {
    return currentStatus;
  }
  return incomingStatus;
}

function laterDate(current, incoming) {
  if (!current) return incoming || null;
  if (!incoming) return current;
  return incoming > current ? incoming : current;
}

function periodDates(entity, plan, allowFallback = false) {
  const config = PLAN_CONFIG[plan];
  const start = unixDate(entity.current_start) || unixDate(entity.start_at) || null;
  let end = unixDate(entity.current_end) || unixDate(entity.end_at) || null;
  if (!end && allowFallback && config) {
    end = new Date(Date.now() + config.fallbackPeriodMs);
  }
  return { start, end };
}

async function issueSubscriptionTokens(subscriptionId, options = {}) {
  const claimToken = options.claim === false ? null : makeOpaqueToken();
  const manageToken = options.manage === false ? null : makeOpaqueToken();
  const now = Date.now();
  const data = {};
  if (claimToken) {
    data.claimTokenHash = tokenHash(claimToken);
    data.claimTokenExpiresAt = new Date(now + CLAIM_TOKEN_TTL_MS);
  }
  if (manageToken) {
    data.manageTokenHash = tokenHash(manageToken);
    data.manageTokenExpiresAt = new Date(now + MANAGE_TOKEN_TTL_MS);
  }
  const subscription = await prisma.webSubscription.update({
    where: { id: subscriptionId },
    data
  });
  return { subscription, claimToken, manageToken, manageTokenExpiresAt: new Date(now + MANAGE_TOKEN_TTL_MS) };
}

async function findSubscriptionByClaimToken(token) {
  if (!token || typeof token !== 'string') return null;
  return prisma.webSubscription.findUnique({ where: { claimTokenHash: tokenHash(token) } });
}

async function findSubscriptionByManageToken(token) {
  if (!token || typeof token !== 'string') return null;
  return prisma.webSubscription.findUnique({ where: { manageTokenHash: tokenHash(token) } });
}

async function upsertSubscriptionPayment(subscription, payment, period = {}) {
  if (!subscription || !payment || !payment.id) return null;
  return prisma.webSubscriptionPayment.upsert({
    where: { razorpayPaymentId: payment.id },
    update: {
      amount: Number(payment.amount || 0),
      currency: payment.currency || subscription.currency,
      status: payment.status || null,
      method: payment.method || null,
      captured: typeof payment.captured === 'boolean' ? payment.captured : null,
      currentPeriodStart: period.start || null,
      currentPeriodEnd: period.end || null,
      rawPayloadJson: payment
    },
    create: {
      webSubscriptionId: subscription.id,
      razorpayPaymentId: payment.id,
      amount: Number(payment.amount || 0),
      currency: payment.currency || subscription.currency,
      status: payment.status || null,
      method: payment.method || null,
      captured: typeof payment.captured === 'boolean' ? payment.captured : null,
      currentPeriodStart: period.start || null,
      currentPeriodEnd: period.end || null,
      rawPayloadJson: payment
    }
  });
}

async function syncEntitlementForSubscription(subscription) {
  if (!subscription || !subscription.revenueCatAppUserId) return subscription;
  const now = new Date();
  const hasPaidTime = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now;

  if (isAccessStatus(subscription.status) && hasPaidTime) {
    const alreadyGranted = subscription.entitlementGrantedUntil;
    if (!alreadyGranted || subscription.currentPeriodEnd.getTime() - alreadyGranted.getTime() > 60 * 60 * 1000) {
      await grantStoicProEntitlement(subscription.revenueCatAppUserId, subscription.currentPeriodEnd);
      return prisma.webSubscription.update({
        where: { id: subscription.id },
        data: { entitlementGrantedUntil: subscription.currentPeriodEnd }
      });
    }
    return subscription;
  }

  if (isTerminalStatus(subscription.status) || (subscription.status === 'cancelled' && !hasPaidTime)) {
    await revokeStoicProEntitlement(subscription.revenueCatAppUserId);
    return prisma.webSubscription.update({
      where: { id: subscription.id },
      data: { entitlementGrantedUntil: now }
    });
  }

  return subscription;
}

async function syncRazorpaySubscriptionEntity(entity, options = {}) {
  if (!entity || !entity.id) return null;
  const notes = entity.notes && typeof entity.notes === 'object' ? entity.notes : {};
  let subscription = await prisma.webSubscription.findUnique({
    where: { razorpaySubscriptionId: entity.id }
  });
  if (!subscription && notes.local_subscription_id) {
    subscription = await prisma.webSubscription.findUnique({
      where: { id: String(notes.local_subscription_id) }
    });
  }
  if (!subscription) return null;

  const incomingStatus = mapRazorpayStatus(entity.status);
  const status = resolveSubscriptionStatus(subscription.status, incomingStatus);
  const period = periodDates(entity, subscription.plan, options.allowPeriodFallback === true);
  const currentPeriodEnd = laterDate(subscription.currentPeriodEnd, period.end);
  const advancesPeriod = !subscription.currentPeriodEnd || (period.end && period.end >= subscription.currentPeriodEnd);
  const updated = await prisma.webSubscription.update({
    where: { id: subscription.id },
    data: {
      razorpaySubscriptionId: entity.id,
      razorpayCustomerId: entity.customer_id || subscription.razorpayCustomerId,
      status,
      currentPeriodStart: advancesPeriod ? (period.start || subscription.currentPeriodStart) : subscription.currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(entity.cancel_at_cycle_end) || subscription.cancelAtPeriodEnd,
      cancelledAt: status === 'cancelled' ? (unixDate(entity.ended_at) || new Date()) : subscription.cancelledAt,
      lastWebhookAt: options.fromWebhook ? new Date() : subscription.lastWebhookAt,
      rawPayloadJson: entity
    }
  });

  return syncEntitlementForSubscription(updated);
}

async function refreshSubscriptionFromRazorpay(subscription, options = {}) {
  if (!subscription || !subscription.razorpaySubscriptionId) return subscription;
  const entity = await fetchRazorpaySubscription(subscription.razorpaySubscriptionId);
  return syncRazorpaySubscriptionEntity(entity, options);
}

module.exports = {
  PLAN_CONFIG,
  cleanString,
  cleanEmail,
  cleanObject,
  getPlanConfig,
  tokenHash,
  makeOpaqueToken,
  mapRazorpayStatus,
  isAccessStatus,
  isTerminalStatus,
  resolveSubscriptionStatus,
  laterDate,
  periodDates,
  issueSubscriptionTokens,
  findSubscriptionByClaimToken,
  findSubscriptionByManageToken,
  upsertSubscriptionPayment,
  syncEntitlementForSubscription,
  syncRazorpaySubscriptionEntity,
  refreshSubscriptionFromRazorpay
};
