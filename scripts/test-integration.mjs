import { readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"
const database = process.env.TEST_DATABASE_URL
if (!database)
  throw new Error("Define TEST_DATABASE_URL con una base de pruebas aislada. No se usa DATABASE_URL del proyecto.")
const url = new URL(database)
if (!/(^|[_-])(test|ci)([_-]|$)/i.test(url.pathname.slice(1)))
  throw new Error("El nombre de la base de pruebas debe contener test o ci para evitar usar datos operativos.")
const env = {
  ...process.env,
  DATABASE_URL: database,
  DIRECT_URL: database,
  RUN_DELIVERY_INTEGRATION: "1",
  RUN_ASSOCIATION_INTEGRATION: "1",
  RUN_SUPPLY_INTEGRATION: "1",
  RUN_REQUEST_INTEGRATION: "1",
  RUN_WORKFLOWS_INTEGRATION: "1",
  RUN_USERS_INTEGRATION: "1",
  RUN_AUDIT_INTEGRATION: "1",
  RUN_MIGRATION_INTEGRATION: "1",
}
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run(["node_modules/prisma/build/index.js", "migrate", "deploy"])
const files = readdirSync("tests")
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => `tests/${file}`)
for (const folder of readdirSync("src/features", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  for (const file of readdirSync(`src/features/${folder.name}`).filter((file) => file.endsWith(".test.ts")))
    files.push(`src/features/${folder.name}/${file}`)
}
run(["--experimental-test-module-mocks", "--import", "tsx", "--test", "--test-concurrency=1", ...files])
