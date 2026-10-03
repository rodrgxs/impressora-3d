-- Add database-level validation for positive quantities and non-negative amounts.
ALTER TABLE "QuoteRequest"
ADD CONSTRAINT "QuoteRequest_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "Proposal"
ADD CONSTRAINT "Proposal_amount_non_negative" CHECK ("amount" >= 0),
ADD CONSTRAINT "Proposal_deliveryDays_positive" CHECK ("deliveryDays" IS NULL OR "deliveryDays" > 0);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotal" >= 0),
ADD CONSTRAINT "Order_shippingAmount_non_negative" CHECK ("shippingAmount" >= 0),
ADD CONSTRAINT "Order_totalAmount_non_negative" CHECK ("totalAmount" >= 0);

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0),
ADD CONSTRAINT "Payment_provider_reference_paired_non_empty" CHECK (
    ("provider" IS NULL AND "providerReference" IS NULL)
    OR (
        "provider" IS NOT NULL
        AND "providerReference" IS NOT NULL
        AND btrim("provider") <> ''
        AND btrim("providerReference") <> ''
    )
);

-- PostgreSQL permits repeated NULL values in a unique key, while preventing
-- the same provider transaction reference from being stored more than once.
DROP INDEX "Payment_provider_providerReference_idx";

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_provider_providerReference_key"
UNIQUE ("provider", "providerReference");
