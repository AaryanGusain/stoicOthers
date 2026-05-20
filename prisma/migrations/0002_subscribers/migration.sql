CREATE TABLE "subscribers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "source" TEXT,
  "ip_country" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "lessons_sent_at" TIMESTAMP(3),
  "signup_count" INTEGER NOT NULL DEFAULT 1,
  "unsubscribed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "subscribers_created_at_idx" ON "subscribers"("created_at");
