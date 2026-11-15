-- An inherited event change must remain possible on historical rows whose RUT is unknown.
-- The delivery API still requires a valid RUT when editing these rows.
ALTER TABLE delivery DROP CONSTRAINT delivery_rut_required;
CREATE FUNCTION require_delivery_rut() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."beneficiaryRut" IS NULL AND (TG_OP = 'INSERT' OR OLD."beneficiaryRut" IS NOT NULL) THEN
   RAISE EXCEPTION 'A RUT is required for new deliveries and cannot be removed' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER require_delivery_rut BEFORE INSERT OR UPDATE ON delivery FOR EACH ROW EXECUTE FUNCTION require_delivery_rut();
