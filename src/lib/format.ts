/* Helpers de fecha y formato — portados del mockup (src/ui.jsx). */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const MESES_L = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

/** Parsea "YYYY-MM-DD" como fecha local (no UTC) para evitar corrimientos de día. */
export function parseISO(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s)
  return isNaN(d.getTime()) ? null : d
}

export function fmtDate(s: string | null | undefined): string {
  const d = parseISO(s)
  if (!d) return "—"
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateLong(s: string | null | undefined): string {
  const d = parseISO(s)
  if (!d) return "—"
  return `${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`
}

export function fmtDateTime(s: string | null | undefined): string {
  const d = parseISO(s)
  if (!d) return "—"
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

export function relTime(s: string | null | undefined): string {
  const d = parseISO(s)
  if (!d) return ""
  const diff = Math.round((Date.now() - d.getTime()) / 86400000)
  if (diff <= 0) return "hoy"
  if (diff === 1) return "ayer"
  if (diff < 30) return `hace ${diff} días`
  if (diff < 60) return "hace 1 mes"
  return `hace ${Math.round(diff / 30)} meses`
}

export function initials(nombre?: string | null, apellido?: string | null): string {
  return ((nombre?.[0] ?? "") + (apellido?.[0] ?? "")).toUpperCase()
}

export function fmtBytes(n: number | null | undefined): string {
  if (n == null) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function fileMeta(name: string): { color: string; label: string } {
  const ext = (name.split(".").pop() ?? "").toLowerCase()
  if (ext === "pdf") return { color: "#C0392B", label: "PDF" }
  if (["jpg", "jpeg"].includes(ext)) return { color: "#2E7D5B", label: "JPG" }
  if (ext === "png") return { color: "#2563A8", label: "PNG" }
  return { color: "#6B7686", label: ext.toUpperCase() || "FILE" }
}

/** Fecha de hoy en formato "YYYY-MM-DD" (zona local). */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Convierte un Date de Prisma a "YYYY-MM-DD" preservando el día calendario en UTC. */
export function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}
