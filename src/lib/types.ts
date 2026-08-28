/* ============================================================
   Tipos del dominio expuestos a la UI.

   El schema de Prisma está en inglés; las vistas están portadas del
   mockup y hablan en español. La traducción ocurre una sola vez, en
   src/server/data.ts, para que las vistas queden idénticas al diseño.
   ============================================================ */

export type Rol = "admin" | "regular"
export type EstadoUsuario = "activo" | "inactivo"
export type EstadoSolicitud = "pendiente" | "atendida" | "anulada"
export type TipoArchivo = "jpg" | "png" | "pdf"

export type Usuario = {
  id: string
  nombre: string
  apellido: string
  correo: string
  rol: Rol
  estado: EstadoUsuario
  creado: string
}

export type TipoEvento = {
  id: string
  nombre: string
}

export type Insumo = {
  id: string
  tipo: string
  unidad: string
}

export type Evento = {
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

export type Solicitud = {
  id: string
  folio: string
  medio: string
  descripcion: string
  respuesta: string
  estado: EstadoSolicitud
  eventoId: string | null
  creadoPor: string
  creado: string
}

export type EntregaItem = {
  insumoId: string
  cantidad: number
}

export type Entrega = {
  id: string
  folio: string
  solicitudId: string | null
  eventoId: string | null
  fecha: string
  direccion: string
  beneficiario: string
  contacto: string
  jv: string
  items: EntregaItem[]
  creadoPor: string
  creado: string
}

export type Accion = {
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

export type Evidencia = {
  id: string
  nombre: string
  tipo: TipoArchivo
  size: number
  /** Ruta servida por /api/evidencia/[id] — nunca la key en disco. */
  url: string
}

export type Actividad = {
  id: string
  accionId: string
  fecha: string
  direccion: string
  objetivo: string
  participantes: string
  evidencia: Evidencia[]
  creadoPor: string
  creado: string
}

export type AppData = {
  usuarios: Usuario[]
  tiposEvento: TipoEvento[]
  insumos: Insumo[]
  eventos: Evento[]
  solicitudes: Solicitud[]
  entregas: Entrega[]
  acciones: Accion[]
  actividades: Actividad[]
}

export type SesionUsuario = {
  id: string
  nombre: string
  apellido: string
  correo: string
  rol: Rol
}

/** Resultado uniforme de las server actions. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }
