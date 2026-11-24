CREATE TYPE "WebSubscriptionPlan" AS ENUM ('weekly', 'annual');

CREATE TYPE "WebSubscriptionStatus" AS ENUM (
  'created',
  'authenticated',
  'active',
  'past_due',
  'halted',
  'cancelled',
  'completed',
  'expired',
  'refunded'
);

CREATE TABLE "web_leads" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
  "answers_json" JSONB,
  "attribution_json" JSONB,
  "referrer" TEXT,
  "ip_address" TEXT,
  "ip_country" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "web_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "web_subscriptions" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT,
  "email" TEXT NOT NULL,
  "plan" "WebSubscriptionPlan" NOT NULL,
  "status" "WebSubscriptionStatus" NOT NULL DEFAULT 'created',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "razorpay_plan_id" TEXT NOT NULL,
  "razorpay_subscription_id" TEXT,
  "razorpay_customer_id" TEXT,
  "latest_payment_id" TEXT,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "cancelled_at" TIMESTAMP(3),
  "firebase_uid" TEXT,
  "revenuecat_app_user_id" TEXT,
  "claim_token_hash" TEXT,
  "claim_token_expires_at" TIMESTAMP(3),
  "claimed_at" TIMESTAMP(3),
  "manage_token_hash" TEXT,
  "manage_token_expires_at" TIMESTAMP(3),
  "entitlement_granted_until" TIMESTAMP(3),
  "last_webhook_at" TIMESTAMP(3),
  "raw_payload_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "web_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "web_subscription_payments" (
  "id" TEXT NOT NULL,
  "web_subscription_id" TEXT NOT NULL,
  "razorpay_payment_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT,
  "method" TEXT,
  "captured" BOOLEAN,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "raw_payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "web_subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_leads_session_id_key" ON "web_leads"("session_id");
CREATE INDEX "web_leads_email_idx" ON "web_leads"("email");
CREATE INDEX "web_leads_created_at_idx" ON "web_leads"("created_at");

CREATE UNIQUE INDEX "web_subscriptions_razorpay_subscription_id_key" ON "web_subscriptions"("razorpay_subscription_id");
CREATE UNIQUE INDEX "web_subscriptions_claim_token_hash_key" ON "web_subscriptions"("claim_token_hash");
CREATE UNIQUE INDEX "web_subscriptions_manage_token_hash_key" ON "web_subscriptions"("manage_token_hash");
CREATE INDEX "web_subscriptions_email_idx" ON "web_subscriptions"("email");
CREATE INDEX "web_subscriptions_firebase_uid_idx" ON "web_subscriptions"("firebase_uid");
CREATE INDEX "web_subscriptions_status_idx" ON "web_subscriptions"("status");
CREATE INDEX "web_subscriptions_current_period_end_idx" ON "web_subscriptions"("current_period_end");

CREATE UNIQUE INDEX "web_subscription_payments_razorpay_payment_id_key" ON "web_subscription_payments"("razorpay_payment_id");
CREATE INDEX "web_subscription_payments_web_subscription_id_idx" ON "web_subscription_payments"("web_subscription_id");
CREATE INDEX "web_subscription_payments_created_at_idx" ON "web_subscription_payments"("created_at");

ALTER TABLE "web_subscriptions"
  ADD CONSTRAINT "web_subscriptions_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "web_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "web_subscription_payments"
  ADD CONSTRAINT "web_subscription_payments_web_subscription_id_fkey"
  FOREIGN KEY ("web_subscription_id") REFERENCES "web_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
