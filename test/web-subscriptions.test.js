const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  cleanEmail,
  cleanObject,
  getPlanConfig,
  laterDate,
  mapRazorpayStatus,
  periodDates,
  resolveSubscriptionStatus,
  tokenHash
} = require('../api/_web-subscriptions');
const { verifySubscriptionCheckoutSignature } = require('../api/_razorpay');

test('web subscription input helpers sanitize email and nested answers', () => {
  assert.equal(cleanEmail('  Buyer@Example.COM '), 'buyer@example.com');
  assert.equal(cleanEmail('not-an-email'), null);
  assert.deepEqual(cleanObject({ goal: '<calm>', choices: ['one', 'two'] }), {
    goal: '<calm>',
    choices: ['one', 'two']
  });
});

test('Razorpay states map to stable local lifecycle states', () => {
  assert.equal(mapRazorpayStatus('active'), 'active');
  assert.equal(mapRazorpayStatus('pending'), 'past_due');
  assert.equal(mapRazorpayStatus('halted'), 'halted');
  assert.equal(mapRazorpayStatus('cancelled'), 'cancelled');
  assert.equal(mapRazorpayStatus('unknown'), 'created');
});

test('out-of-order lifecycle data cannot shorten access or revive a terminal subscription', () => {
  const paidThrough = new Date('2026-08-01T00:00:00.000Z');
  const olderPeriod = new Date('2026-07-20T00:00:00.000Z');

  assert.equal(resolveSubscriptionStatus('active', 'authenticated'), 'active');
  assert.equal(resolveSubscriptionStatus('cancelled', 'active'), 'cancelled');
  assert.equal(resolveSubscriptionStatus('refunded', 'active'), 'refunded');
  assert.equal(resolveSubscriptionStatus('past_due', 'active'), 'active');
  assert.equal(laterDate(paidThrough, olderPeriod), paidThrough);
});

test('preview checkout refuses non-test Razorpay credentials', () => {
  const previous = {
    env: process.env.VERCEL_ENV,
    key: process.env.RAZORPAY_KEY_ID,
    plan: process.env.RAZORPAY_STOIC_WEEKLY_PLAN_ID
  };
  process.env.VERCEL_ENV = 'preview';
  process.env.RAZORPAY_KEY_ID = 'rzp_live_example';
  process.env.RAZORPAY_STOIC_WEEKLY_PLAN_ID = 'plan_example';
  assert.throws(() => getPlanConfig('weekly'), /Test Mode/);

  process.env.RAZORPAY_KEY_ID = 'rzp_test_example';
  assert.equal(getPlanConfig('weekly').planId, 'plan_example');
  Object.entries({
    VERCEL_ENV: previous.env,
    RAZORPAY_KEY_ID: previous.key,
    RAZORPAY_STOIC_WEEKLY_PLAN_ID: previous.plan
  }).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

test('period dates use gateway dates and a plan fallback only when allowed', () => {
  const entity = { current_start: 1_700_000_000, current_end: 1_700_604_800 };
  const period = periodDates(entity, 'weekly');
  assert.equal(period.start.toISOString(), '2023-11-14T22:13:20.000Z');
  assert.equal(period.end.toISOString(), '2023-11-21T22:13:20.000Z');
  assert.equal(periodDates({}, 'weekly').end, null);
  assert.ok(periodDates({}, 'weekly', true).end instanceof Date);
});

test('claim tokens are hashed and subscription checkout signatures are verified', () => {
  const previous = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'test-secret';
  const paymentId = 'pay_test';
  const subscriptionId = 'sub_test';
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');

  assert.equal(tokenHash('claim-token').length, 64);
  assert.equal(
    verifySubscriptionCheckoutSignature({ subscriptionId, paymentId, signature }),
    true
  );
  assert.equal(
    verifySubscriptionCheckoutSignature({ subscriptionId, paymentId, signature: 'bad' }),
    false
  );
  process.env.RAZORPAY_KEY_SECRET = previous;
});
