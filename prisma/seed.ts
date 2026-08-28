/* ============================================================
   Seed — DGRD Ñuñoa

   Carga los datos reales del municipio provenientes del mockup
   (planillas Plan RRD 2026 + Entregas Ayudas 1ª respuesta 2026),
   más los casos de ejemplo de Eventos y Solicitudes: esas dos
   entidades son nuevas y las planillas no las traen, así que sin
   ellas el módulo de Emergencias arrancaría vacío.

   Es idempotente: usa upsert con los ids del mockup como clave.
   Los usuarios se crean vía Better Auth para que la contraseña
   quede hasheada con el mismo algoritmo que usa el login.

   Ejecutar:  npx tsx prisma/seed.ts
   ============================================================ */
// Debe ir primero: deja el entorno listo antes de que se evalúe el cliente de
// Prisma y la config de Better Auth.
import "./load-env"

import { readFileSync } from "node:fs"
import path from "node:path"
import { auth } from "../src/lib/auth"
import prisma from "../src/lib/prisma"

type SeedUsuario = { id: string; nombre: string; apellido: string; correo: string; rol: string; estado: string }
type SeedTipo = { id: string; nombre: string }
type SeedInsumo = { id: string; tipo: string; unidad: string }
type SeedEvento = {
  id: string
  folio: string
  tipoId: string
  fecha: string
  sector: string
  afectados: number
  instituciones: string
  acciones: string
  creadoPor: string
  creado: string
}
type SeedSolicitud = {
  id: string
  folio: string
  medio: string
  descripcion: string
  respuesta: string
  estado: "pendiente" | "atendida" | "anulada"
  eventoId: string | null
  creadoPor: string
  creado: string
}
type SeedEntrega = {
  id: string
  folio: string
  fecha: string
  direccion: string
  beneficiario: string
  contacto: string
  jv: string
  items: { insumoId: string; cantidad: number }[]
  creadoPor: string
  creado: string
}
type SeedAccion = {
  id: string
  numero: number
  anio: number
  titulo: string
  fechaInicio: string
  fechaTermino: string
  comoDesarrollar: string
  temas: string
  creadoPor: string
  creado: string
}
type SeedActividad = {
  id: string
  accionId: string
  fecha: string
  direccion: string
  objetivo: string
  participantes: string
  creadoPor: string
  creado: string
}

type SeedData = {
  usuarios: SeedUsuario[]
  tiposEvento: SeedTipo[]
  insumos: SeedInsumo[]
  eventos: SeedEvento[]
  solicitudes: SeedSolicitud[]
  entregas: SeedEntrega[]
  acciones: SeedAccion[]
  actividades: SeedActividad[]
  entregaLinks: Record<string, string>
}

const ESTADO_A_DB = { pendiente: "pending", atendida: "attended", anulada: "cancelled" } as const

const PASSWORD = process.env.SEED_PASSWORD?.trim() || "dgrd2026"

/** "YYYY-MM-DD" → Date en UTC, para que el día calendario no se corra. */
const dia = (s: string) => new Date(`${s}T00:00:00.000Z`)
const instante = (s: string) => new Date(s.length <= 10 ? `${s}T00:00:00.000Z` : `${s}Z`)

async function main() {
  const data: SeedData = JSON.parse(readFileSync(path.join(process.cwd(), "prisma/seed-data.json"), "utf8"))

  /* ---------- Usuarios ---------- */
  // Better Auth genera el id; guardamos el mapa mockup → real para el resto.
  const userId = new Map<string, string>()

  for (const u of data.usuarios) {
    const existente = await prisma.user.findUnique({ where: { email: u.correo } })
    if (existente) {
      userId.set(u.id, existente.id)
      continue
    }
    await auth.api.signUpEmail({
      body: { email: u.correo, password: PASSWORD, name: u.nombre },
    })
    const creado = await prisma.user.findUniqueOrThrow({ where: { email: u.correo } })
    userId.set(u.id, creado.id)
  }

  // El rol, el apellido y el estado no pasan por signUpEmail.
  for (const u of data.usuarios) {
    await prisma.user.update({
      where: { id: userId.get(u.id)! },
      data: {
        name: u.nombre,
        lastName: u.apellido,
        role: u.rol === "admin" ? "admin" : "regular",
        banned: u.estado !== "activo",
        banReason: u.estado !== "activo" ? "Cuenta desactivada" : null,
        emailVerified: true,
      },
    })
  }
  const autor = (id: string) => userId.get(id) ?? userId.get("u-1")!
  console.log(`✓ ${data.usuarios.length} usuarios (contraseña: ${PASSWORD})`)

  /* ---------- Catálogos ---------- */
  for (const t of data.tiposEvento) {
    await prisma.eventType.upsert({
      where: { id: t.id },
      update: { name: t.nombre },
      create: { id: t.id, name: t.nombre, createdBy: autor("u-1") },
    })
  }
  console.log(`✓ ${data.tiposEvento.length} tipos de evento`)

  for (const i of data.insumos) {
    await prisma.supply.upsert({
      where: { id: i.id },
      update: { type: i.tipo, unit: i.unidad },
      create: { id: i.id, type: i.tipo, unit: i.unidad, createdBy: autor("u-1") },
    })
  }
  console.log(`✓ ${data.insumos.length} insumos`)

  /* ---------- Emergencias ---------- */
  for (const e of data.eventos) {
    const campos = {
      folio: e.folio,
      typeId: e.tipoId,
      date: dia(e.fecha),
      sector: e.sector,
      affectedCount: e.afectados,
      institutions: e.instituciones,
      actions: e.acciones,
      createdAt: instante(e.creado),
    }
    await prisma.event.upsert({
      where: { id: e.id },
      update: campos,
      create: { id: e.id, ...campos, createdBy: autor(e.creadoPor) },
    })
  }
  console.log(`✓ ${data.eventos.length} eventos`)

  for (const s of data.solicitudes) {
    const campos = {
      folio: s.folio,
      channel: s.medio,
      description: s.descripcion || null,
      response: s.respuesta || null,
      status: ESTADO_A_DB[s.estado],
      eventId: s.eventoId,
      createdAt: instante(s.creado),
    }
    await prisma.request.upsert({
      where: { id: s.id },
      update: campos,
      create: { id: s.id, ...campos, createdBy: autor(s.creadoPor) },
    })
  }
  console.log(`✓ ${data.solicitudes.length} solicitudes`)

  // Solo algunas entregas quedan vinculadas a una solicitud (y por ella a un
  // evento); el resto son entregas independientes, como en la planilla real.
  const solicitudDeEntrega = data.entregaLinks
  const eventoDeSolicitud = new Map(data.solicitudes.map((s) => [s.id, s.eventoId]))

  for (const en of data.entregas) {
    const requestId = solicitudDeEntrega[en.id] ?? null
    const campos = {
      folio: en.folio,
      requestId,
      eventId: requestId ? (eventoDeSolicitud.get(requestId) ?? null) : null,
      date: dia(en.fecha),
      address: en.direccion,
      beneficiary: en.beneficiario,
      contact: en.contacto,
      jv: en.jv,
      createdAt: instante(en.creado),
    }
    await prisma.delivery.upsert({
      where: { id: en.id },
      update: campos,
      create: { id: en.id, ...campos, createdBy: autor(en.creadoPor) },
    })
    // Los ítems se reemplazan por completo para que el seed sea idempotente.
    await prisma.deliveryItem.deleteMany({ where: { deliveryId: en.id } })
    await prisma.deliveryItem.createMany({
      data: en.items.map((it) => ({ deliveryId: en.id, supplyId: it.insumoId, quantity: it.cantidad })),
    })
  }
  console.log(`✓ ${data.entregas.length} entregas`)

  /* ---------- Plan RRD ---------- */
  for (const a of data.acciones) {
    const campos = {
      number: a.numero,
      year: a.anio,
      title: a.titulo,
      startDate: dia(a.fechaInicio),
      endDate: dia(a.fechaTermino),
      implementation: a.comoDesarrollar,
      topics: a.temas,
      createdAt: instante(a.creado),
    }
    await prisma.strategicAction.upsert({
      where: { id: a.id },
      update: campos,
      create: { id: a.id, ...campos, createdBy: autor(a.creadoPor) },
    })
  }
  console.log(`✓ ${data.acciones.length} acciones estratégicas`)

  for (const act of data.actividades) {
    const campos = {
      actionId: act.accionId,
      date: dia(act.fecha),
      location: act.direccion,
      objective: act.objetivo,
      participants: act.participantes,
      createdAt: instante(act.creado),
    }
    await prisma.activity.upsert({
      where: { id: act.id },
      update: campos,
      create: { id: act.id, ...campos, createdBy: autor(act.creadoPor) },
    })
  }
  console.log(`✓ ${data.actividades.length} actividades`)

  const admin = data.usuarios.find((u) => u.rol === "admin")
  console.log(`\nListo. Ingresa con ${admin?.correo} / ${PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
