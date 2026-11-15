-- Legacy rows remain unknown rather than inventing identities. New and updated rows require a RUT.
ALTER TABLE "delivery" ADD COLUMN "beneficiaryRut" TEXT;
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_rut_required" CHECK ("beneficiaryRut" IS NOT NULL) NOT VALID;
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_rut_format" CHECK ("beneficiaryRut" ~ '^[1-9][0-9]{6,7}-[0-9K]$');
CREATE INDEX "delivery_beneficiaryRut_date_idx" ON "delivery"("beneficiaryRut", "date");
