// Config de Prisma.
//
// Next carga .env.local con precedencia sobre .env; acá replicamos ese orden a
// mano porque `dotenv/config` solo lee .env, y los connection strings viven en
// .env.local (gitignored).
//
// Las migraciones deben correr contra la conexión DIRECTA (unpooled) de Neon:
// el pooler no soporta las sentencias que emite el motor de migraciones. En
// runtime, en cambio, la app usa la pooled (ver src/lib/prisma.ts).
import { config as loadEnv } from "dotenv"
import { defineConfig } from "prisma/config"

loadEnv({ path: ".env.local", quiet: true })
loadEnv({ path: ".env", quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
})
