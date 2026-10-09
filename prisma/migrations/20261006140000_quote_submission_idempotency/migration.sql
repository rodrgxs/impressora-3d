-- Additive migration. Existing requests keep NULL keys and their original ownership.
ALTER TABLE "QuoteRequest" ADD COLUMN "submissionKey" VARCHAR(64), ADD COLUMN "submissionHash" VARCHAR(64);
CREATE UNIQUE INDEX "QuoteRequest_submissionKey_key" ON "QuoteRequest"("submissionKey");
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_submission_pair_check" CHECK (
  ("submissionKey" IS NULL AND "submissionHash" IS NULL) OR
  ("submissionKey" IS NOT NULL AND "submissionHash" IS NOT NULL AND
   "submissionKey" ~ '^[0-9a-f]{64}$' AND "submissionHash" ~ '^[0-9a-f]{64}$')
);
