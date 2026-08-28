import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { del, get, put } from "@vercel/blob"

/**
 * Almacenamiento de la evidencia de las actividades.
 *
 * Dos backends:
 *
 * · **Vercel Blob (privado)** cuando existe BLOB_READ_WRITE_TOKEN (lo inyecta
 *   Vercel al conectar el store). Es el único que sirve en serverless: allí el
 *   filesystem es de solo lectura salvo /tmp, y /tmp es efímero y no se
 *   comparte entre instancias.
 * · **Disco local** en cualquier otro caso, bajo EVIDENCE_DIR. Mantiene el
 *   desarrollo local funcionando sin depender de una cuenta de Vercel.
 *
 * `access: "private"` significa que el objeto no es accesible por URL: leerlo
 * exige el token del store. Sumado a que /api/evidencia/[id] valida la sesión,
 * el archivo queda protegido aunque su ruta se filtre.
 *
 * En `Evidence.key` se guarda el *pathname* dentro del store con el prefijo
 * `blob:`, no una URL: sobrevive a un cambio de store y distingue sin
 * ambigüedad de una key de disco (un nombre de archivo suelto).
 *
 * El backend de lectura y borrado se decide por el valor de la key, no por el
 * entorno: una fila escrita en disco se sigue leyendo del disco aunque después
 * aparezca el token, y viceversa. Así no hay filas huérfanas al cambiar de
 * backend.
 */

const MAX_FILE = 10 * 1024 * 1024 // 10 MB
const EXT_PERMITIDAS = new Set(["jpg", "jpeg", "png", "pdf"])

export const MIME_POR_TIPO: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
}

const BLOB_PREFIX = "blob:"

/**
 * En Vercel el filesystem es de solo lectura salvo /tmp, así que el backend de
 * disco no es una alternativa válida: si falta el token hay que fallar con un
 * mensaje accionable, no intentar escribir y morir con un ENOENT en /var/task.
 *
 * VERCEL_ENV === "development" es `vercel dev`, que sí corre sobre disco real.
 */
const esServerless = () => !!process.env.VERCEL && process.env.VERCEL_ENV !== "development"

/**
 * Token del Blob store.
 *
 * Vercel usa BLOB_READ_WRITE_TOKEN por defecto, pero renombra la variable a
 * `<PREFIJO>_READ_WRITE_TOKEN` cuando el store se conecta con un prefijo
 * propio o cuando hay más de uno en el proyecto. Por eso, si el nombre estándar
 * no está, se acepta cualquier variable con ese sufijo.
 */
function blobToken(): string | undefined {
  const estandar = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (estandar) return estandar

  for (const [nombre, valor] of Object.entries(process.env)) {
    if (nombre.endsWith("_READ_WRITE_TOKEN") && valor?.trim()) return valor.trim()
  }
  return undefined
}

const ERROR_SIN_STORE =
  "El almacenamiento de archivos no está configurado: falta BLOB_READ_WRITE_TOKEN. " +
  "Conecta el Blob store al proyecto en Vercel (Storage → Blob → Connect Project) " +
  "y vuelve a desplegar para que la variable llegue al runtime."

/** Acepta también URLs absolutas: `get`/`del` las resuelven igual que un pathname. */
const esBlob = (key: string) => key.startsWith(BLOB_PREFIX) || key.startsWith("http://") || key.startsWith("https://")

const refBlob = (key: string) => (key.startsWith(BLOB_PREFIX) ? key.slice(BLOB_PREFIX.length) : key)

function baseDir(): string {
  const dir = process.env.EVIDENCE_DIR?.trim() || ".uploads/evidencia"
  return path.isAbsolute(dir) ? dir : path.join(/* turbopackIgnore: true */ process.cwd(), dir)
}

/** Normaliza la extensión al tipo que guarda la columna Evidence.type. */
export function tipoArchivo(name: string): "jpg" | "png" | "pdf" {
  const ext = (name.split(".").pop() ?? "").toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "png") return "png"
  return "jpg"
}

export type ArchivoGuardado = { key: string; nombre: string; tipo: "jpg" | "png" | "pdf"; size: number }

export async function guardarEvidencia(file: File): Promise<ArchivoGuardado> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!EXT_PERMITIDAS.has(ext)) throw new Error(`${file.name}: formato no permitido (solo JPG, PNG y PDF).`)
  if (file.size > MAX_FILE) throw new Error(`${file.name}: supera los 10 MB.`)
  if (file.size === 0) throw new Error(`${file.name}: el archivo está vacío.`)

  const buf = Buffer.from(await file.arrayBuffer())
  const tipo = tipoArchivo(file.name)
  const nombreEnStore = `${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`
  const token = blobToken()

  if (!token && esServerless()) throw new Error(ERROR_SIN_STORE)

  let key: string
  if (token) {
    const { pathname } = await put(`evidencia/${nombreEnStore}`, buf, {
      access: "private",
      contentType: MIME_POR_TIPO[tipo],
      // Entropía extra en la ruta: no debe ser deducible del id de la fila.
      addRandomSuffix: true,
      token,
    })
    key = BLOB_PREFIX + pathname
  } else {
    key = await guardarEnDisco(nombreEnStore, buf)
  }

  return { key, nombre: file.name, tipo, size: file.size }
}

async function guardarEnDisco(nombre: string, buf: Buffer): Promise<string> {
  const dir = baseDir()
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(/* turbopackIgnore: true */ dir, nombre), buf)
  return nombre
}

export async function leerEvidencia(key: string): Promise<{ buf: Buffer; etag: string }> {
  const buf = esBlob(key) ? await leerDeBlob(key) : await leerDeDisco(key)
  return { buf, etag: `"${createHash("sha1").update(buf).digest("hex")}"` }
}

async function leerDeBlob(key: string): Promise<Buffer> {
  const res = await get(refBlob(key), { access: "private", token: blobToken() })
  if (!res?.stream) throw new Error("El archivo ya no está disponible en el store.")
  return Buffer.from(await new Response(res.stream).arrayBuffer())
}

async function leerDeDisco(key: string): Promise<Buffer> {
  if (esServerless()) throw new Error(ERROR_SIN_STORE)
  // `key` viene de la base, pero se normaliza igual: nunca debe escapar del
  // directorio de subidas.
  const safe = path.basename(key)
  return readFile(path.join(/* turbopackIgnore: true */ baseDir(), safe))
}

export async function borrarEvidencia(key: string): Promise<void> {
  try {
    if (esBlob(key)) await del(refBlob(key), { token: blobToken() })
    else await unlink(path.join(/* turbopackIgnore: true */ baseDir(), path.basename(key)))
  } catch {
    // El archivo ya no está: la fila de la base manda, no bloqueamos el borrado.
  }
}
