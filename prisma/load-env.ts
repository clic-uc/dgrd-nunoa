/**
 * Carga las variables de entorno con el mismo orden de precedencia que Next
 * (.env.local sobre .env).
 *
 * Vive en su propio módulo porque los imports de ESM se evalúan antes que el
 * cuerpo del archivo: si esto estuviera dentro de seed.ts, `src/lib/prisma.ts`
 * ya habría leído un DATABASE_URL vacío. Importar este módulo primero garantiza
 * que el entorno esté listo antes de instanciar el cliente.
 */
import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env.local", quiet: true })
loadEnv({ path: ".env", quiet: true })
