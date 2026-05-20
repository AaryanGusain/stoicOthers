CREATE TYPE "OrderStatus" AS ENUM ('created', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');

CREATE TABLE "customers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "first_declared_country" TEXT,
  "first_ip_country" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "digital_orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "customer_id" TEXT REFERENCES "customers"("id"),
  "customer_email" TEXT NOT NULL,
  "customer_name" TEXT,
  "declared_country" TEXT NOT NULL,
  "declared_state_region" TEXT,
  "ip_address" TEXT,
  "ip_country" TEXT,
  "country_mismatch" BOOLEAN NOT NULL DEFAULT false,
  "currency" TEXT NOT NULL,
  "display_currency" TEXT,
  "listed_price" DECIMAL(12,2) NOT NULL,
  "gross_amount" INTEGER NOT NULL,
  "tax_amount_if_any" INTEGER NOT NULL DEFAULT 0,
  "discount_amount" INTEGER NOT NULL DEFAULT 0,
  "net_amount_estimated" INTEGER NOT NULL DEFAULT 0,
  "razorpay_order_id" TEXT UNIQUE,
  "razorpay_payment_id" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'created',
  "payment_method" TEXT,
  "payment_international" BOOLEAN,
  "notes_json" JSONB,
  "referrer" TEXT,
  "user_agent" TEXT,
  "browser_locale" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
  "delivery_email_sent_at" TIMESTAMP(3),
  "delivery_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "razorpay_payments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "digital_order_id" TEXT REFERENCES "digital_orders"("id"),
  "razorpay_payment_id" TEXT NOT NULL UNIQUE,
  "razorpay_order_id" TEXT,
  "razorpay_signature_verified" BOOLEAN NOT NULL DEFAULT false,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "fee" INTEGER,
  "tax" INTEGER,
  "method" TEXT,
  "card_network" TEXT,
  "card_issuer" TEXT,
  "card_international" BOOLEAN,
  "captured" BOOLEAN,
  "status" TEXT,
  "raw_payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "webhook_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_event_id" TEXT UNIQUE,
  "event" TEXT NOT NULL,
  "signature_verified" BOOLEAN NOT NULL DEFAULT false,
  "raw_payload_json" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "refunds" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "digital_order_id" TEXT REFERENCES "digital_orders"("id"),
  "razorpay_refund_id" TEXT UNIQUE,
  "razorpay_payment_id" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT,
  "status" TEXT,
  "raw_payload_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payout_id" TEXT UNIQUE,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT,
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "raw_payload_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "deliveries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "digital_order_id" TEXT NOT NULL REFERENCES "digital_orders"("id"),
  "email" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
  "provider" TEXT,
  "provider_id" TEXT,
  "error" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "monthly_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "month" TEXT NOT NULL UNIQUE,
  "gross_by_currency" JSONB NOT NULL,
  "gross_inr_estimated" INTEGER,
  "fees" INTEGER,
  "refunds" INTEGER,
  "net_revenue" INTEGER,
  "buyer_countries" JSONB,
  "international_sales_count" INTEGER NOT NULL DEFAULT 0,
  "india_sales_count" INTEGER NOT NULL DEFAULT 0,
  "top_traffic_sources" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "digital_orders_customer_email_idx" ON "digital_orders"("customer_email");
CREATE INDEX "digital_orders_status_idx" ON "digital_orders"("status");
CREATE INDEX "digital_orders_created_at_idx" ON "digital_orders"("created_at");
CREATE INDEX "razorpay_payments_razorpay_order_id_idx" ON "razorpay_payments"("razorpay_order_id");
CREATE INDEX "deliveries_digital_order_id_idx" ON "deliveries"("digital_order_id");
