import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Client } from "pg"
import { test } from "node:test"
test(
  "migraciones: históricos sin RUT, folios existentes y referencias protegidas",
  { skip: process.env.RUN_MIGRATION_INTEGRATION !== "1", timeout: 60000 },
  async () => {
    const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
    const schema = `migration_${randomUUID().replaceAll("-", "")}`
    await client.connect()
    try {
      await client.query(`CREATE SCHEMA "${schema}"`)
      await client.query(`SET search_path TO "${schema}", public`)
      const directory = resolve("prisma/migrations")
      for (const entry of readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name === "20261115010000_request_rules_and_folios") {
          await client.query(
            `INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('legacy-user','Histórico','legacy@example.invalid',now())`,
          )
          await client.query(
            `INSERT INTO request(id,folio,channel,"createdBy","updatedAt") VALUES ('legacy-request','SOL-2026-042','Prueba','legacy-user',now()),('uuid-request','SOL-legacy-uuid','Prueba','legacy-user',now())`,
          )
          await client.query(
            `INSERT INTO delivery(id,folio,beneficiary,address,date,"requestId","createdBy","updatedAt") VALUES ('legacy-delivery','ENT-2026-999','Histórico','Calle','2026-11-15','legacy-request','legacy-user',now())`,
          )
        }
        await client.query(readFileSync(resolve(directory, entry.name, "migration.sql"), "utf8"))
      }
      assert.equal(
        (await client.query(`SELECT "beneficiaryRut" FROM delivery WHERE id='legacy-delivery'`)).rows[0].beneficiaryRut,
        null,
      )
      await client.query(`UPDATE delivery SET "eventId"=NULL WHERE id='legacy-delivery'`)
      assert.equal(
        (await client.query(`SELECT value FROM folio_counter WHERE kind='ENT' AND year=2026`)).rows[0].value,
        999,
      )
      assert.equal(
        (await client.query(`SELECT value FROM folio_counter WHERE kind='SOL' AND year=2026`)).rows[0].value,
        42,
      )
      const code = (expected: string[]) => (error: unknown) => expected.includes((error as { code: string }).code)
      await assert.rejects(
        client.query(
          `INSERT INTO delivery(id,folio,beneficiary,address,date,"createdBy","updatedAt") VALUES ('new-delivery','ENT-2026-1000','Nueva','Calle','2026-11-15','legacy-user',now())`,
        ),
        code(["23514"]),
      )
      await client.query(
        `INSERT INTO delivery(id,folio,beneficiary,"beneficiaryRut",address,date,"createdBy","updatedAt") VALUES ('new-delivery','ENT-2026-1000','Nueva','12345678-5','Calle','2026-11-15','legacy-user',now())`,
      )
      await assert.rejects(
        client.query(`UPDATE delivery SET "beneficiaryRut"=NULL WHERE id='new-delivery'`),
        code(["23514"]),
      )
      await assert.rejects(client.query(`DELETE FROM request WHERE id='legacy-request'`), code(["23001", "23503"]))
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.end()
    }
  },
)
