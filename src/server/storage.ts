import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Almacenamiento en disco de la evidencia de las actividades.
 *
 * Vive FUERA de public/: los archivos se sirven por /api/evidencia/[id], que
 * valida sesión antes de responder. En producción esto se reemplaza por S3
 * manteniendo el mismo contrato (Evidence.key sigue siendo la referencia).
 */

const MAX_FILE = 10 * 1024 * 1024 // 10 MB
const EXT_PERMITIDAS = new Set(["jpg", "jpeg", "png", "pdf"])

export const MIME_POR_TIPO: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
}

function baseDir(): string {
  const dir = process.env.EVIDENCE_DIR?.trim() || ".uploads/evidencia"
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
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
  const key = `${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`
  const dir = baseDir()
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, key), buf)

  return { key, nombre: file.name, tipo: tipoArchivo(file.name), size: file.size }
}

export async function leerEvidencia(key: string): Promise<{ buf: Buffer; etag: string }> {
  // `key` viene de la base, pero se normaliza igual: nunca debe escapar del
  // directorio de subidas.
  const safe = path.basename(key)
  const buf = await readFile(path.join(baseDir(), safe))
  return { buf, etag: `"${createHash("sha1").update(buf).digest("hex")}"` }
}

export async function borrarEvidencia(key: string): Promise<void> {
  try {
    await unlink(path.join(baseDir(), path.basename(key)))
  } catch {
    // El archivo ya no está: la fila de la base manda, no bloqueamos el borrado.
  }
}
