ALTER TABLE "request" ADD COLUMN "description" TEXT;
ALTER TABLE "delivery" DROP CONSTRAINT "delivery_requestId_fkey";
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "folio_counter" (
  "kind" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL CHECK ("value" > 0),
  PRIMARY KEY ("kind", "year")
);
-- Preserve the highest existing number independently for each year and entity.
INSERT INTO "folio_counter" ("kind", "year", "value")
SELECT split_part(folio, '-', 1), split_part(folio, '-', 2)::integer, max(split_part(folio, '-', 3)::integer)
FROM (SELECT folio FROM "delivery" UNION ALL SELECT folio FROM "request" UNION ALL SELECT folio FROM "event") AS existing
WHERE folio ~ '^(ENT|SOL|EVT)-[0-9]{4}-[0-9]{1,9}$' AND split_part(folio, '-', 3)::integer > 0
GROUP BY split_part(folio, '-', 1), split_part(folio, '-', 2)::integer;
