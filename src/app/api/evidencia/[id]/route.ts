import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession } from "@/server/session"
import { leerEvidencia, MIME_POR_TIPO } from "@/server/storage"

/**
 * Sirve un archivo de evidencia. Los adjuntos viven fuera de public/, así que
 * esta ruta es el único acceso y siempre exige sesión.
 * `?descargar=1` fuerza la descarga en vez de mostrarlo en línea.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new NextResponse("No autorizado", { status: 401 })

  const { id } = await params
  const ev = await prisma.evidence.findUnique({
    where: { id },
    select: { name: true, type: true, key: true },
  })
  if (!ev) return new NextResponse("No encontrado", { status: 404 })

  let archivo: Awaited<ReturnType<typeof leerEvidencia>>
  try {
    archivo = await leerEvidencia(ev.key)
  } catch {
    // La fila existe pero el archivo no está en disco (p. ej. otro entorno).
    return new NextResponse("Archivo no disponible", { status: 410 })
  }

  const inline = new URL(req.url).searchParams.get("descargar") !== "1"
  const nombre = encodeURIComponent(ev.name)

  return new NextResponse(new Uint8Array(archivo.buf), {
    headers: {
      "Content-Type": MIME_POR_TIPO[ev.type] ?? "application/octet-stream",
      "Content-Length": String(archivo.buf.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${nombre}`,
      ETag: archivo.etag,
      // Privado: el contenido depende de la sesión, no debe cachearse en CDNs.
      "Cache-Control": "private, max-age=3600",
    },
  })
}
