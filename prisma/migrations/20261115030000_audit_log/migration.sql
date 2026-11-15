CREATE TABLE audit_log (
 id BIGSERIAL PRIMARY KEY,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actorId" TEXT,
 "actorName" TEXT,
 entity TEXT NOT NULL,
 "recordId" TEXT NOT NULL,
 operation TEXT NOT NULL,
 "before" JSONB,
 "after" JSONB
);
CREATE INDEX "audit_log_createdAt_id_idx" ON audit_log("createdAt",id);
CREATE INDEX "audit_log_entity_recordId_idx" ON audit_log(entity,"recordId");
CREATE INDEX "audit_log_actorId_idx" ON audit_log("actorId");
CREATE FUNCTION record_domain_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE old_row JSONB; new_row JSONB; identity_row JSONB; actor_id TEXT; actor_name TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
 IF TG_OP = 'UPDATE' AND (old_row - 'updatedAt') = (new_row - 'updatedAt') THEN RETURN NEW; END IF;
 identity_row := COALESCE(new_row,old_row);
 actor_id := NULLIF(current_setting('app.actor_id',true),'');
 SELECT name INTO actor_name FROM "user" WHERE id = actor_id;
 INSERT INTO audit_log("actorId","actorName",entity,"recordId",operation,"before","after")
 VALUES(actor_id,actor_name,TG_TABLE_NAME,COALESCE(identity_row->>'id',concat(identity_row->>'deliveryId',':',identity_row->>'supplyId')),TG_OP,old_row,new_row);
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DO $$ DECLARE table_name TEXT; BEGIN
 FOREACH table_name IN ARRAY ARRAY['user','event_type','supply','neighborhood_association','event','request','delivery','delivery_item','strategic_action','activity','evidence'] LOOP
 EXECUTE format('CREATE TRIGGER domain_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION record_domain_audit()',table_name);
 END LOOP;
END $$;
