"use client"

/* ============================================================
   Contexto de la app — datos, selectores y navegación.

   Portado de AppCtx (src/app.jsx del mockup). Dos diferencias:
   · Los datos vienen del servidor (Prisma) en vez de useState.
   · nav() empuja rutas reales de Next en vez de un estado interno,
     para que las vistas tengan URL propia, back/forward y deep links.
   ============================================================ */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { usePersistedState, useToast, type ToastInput } from "@/components/kit"
import type {
  Accion,
  ActionResult,
  Actividad,
  AppData,
  Entrega,
  Evento,
  Insumo,
  SesionUsuario,
  Solicitud,
  Usuario,
} from "@/lib/types"

export type RouteName =
  | "resumen"
  | "solicitudes"
  | "solicitud"
  | "eventos"
  | "evento"
  | "entregas"
  | "entrega"
  | "insumos"
  | "insumo"
  | "acciones"
  | "accion"
  | "cronograma"
  | "actividad"
  | "usuarios"
  | "config"

export type Route = { name: RouteName; id?: string }

const PATHS: Record<RouteName, (id?: string) => string> = {
  resumen: () => "/resumen",
  solicitudes: () => "/solicitudes",
  solicitud: (id) => `/solicitudes/${id}`,
  eventos: () => "/eventos",
  evento: (id) => `/eventos/${id}`,
  entregas: () => "/entregas",
  entrega: (id) => `/entregas/${id}`,
  insumos: () => "/insumos",
  insumo: (id) => `/insumos/${id}`,
  acciones: () => "/plan/acciones",
  accion: (id) => `/plan/acciones/${id}`,
  cronograma: () => "/plan/cronograma",
  actividad: (id) => `/plan/actividades/${id}`,
  usuarios: () => "/admin/usuarios",
  config: () => "/admin/configuracion",
}

export function routeToPath(r: Route): string {
  return PATHS[r.name](r.id)
}

export type AppCtxValue = {
  data: AppData
  me: SesionUsuario
  /** Rol efectivo: admin real y sin previsualización de "vista usuario". */
  isAdmin: boolean
  /** El usuario es admin de verdad (independiente de la previsualización). */
  realAdmin: boolean
  /** Previsualización de rol. Siempre `false` en producción (ver `PREVIEW_ROL`). */
  viewAsRegular: boolean
  setViewAsRegular: (v: boolean) => void
  canEdit: boolean
  nav: (r: Route) => void
  toast: (t: ToastInput) => void
  /** Ejecuta una server action, muestra el error si falla y refresca al terminar. */
  run: <T>(fn: () => Promise<ActionResult<T>>, ok?: ToastInput) => Promise<T | null>
  busy: boolean

  // selectores (mismos nombres que el mockup)
  tipoNombre: (id: string) => string
  insumo: (id: string) => Insumo | undefined
  evento: (id: string) => Evento | undefined
  solicitud: (id: string) => Solicitud | undefined
  user: (id: string) => Usuario | undefined
  accion: (id: string) => Accion | undefined
  actividad: (id: string) => Actividad | undefined
  entregaDeSolicitud: (sid: string) => Entrega | undefined
  entregasDeSolicitud: (sid: string) => Entrega[]
  eventoDeEntrega: (en: Entrega) => Evento | undefined
  entregasDeEvento: (eid: string) => Entrega[]
  solicitudesDeEvento: (eid: string) => Solicitud[]
  entregasConInsumo: (iid: string) => Entrega[]
  actividadesDeAccion: (aid: string) => Actividad[]
}

const AppCtx = createContext<AppCtxValue | null>(null)

export function useApp(): AppCtxValue {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>")
  return ctx
}

const LS_VIEW = "dgrd_view_as_regular"

/**
 * El toggle "Vista admin / Vista usuario" es una ayuda de desarrollo para revisar la
 * interfaz con permisos de usuario regular. Fuera de `pnpm dev` no se renderiza ni se
 * respeta la preferencia guardada.
 *
 * El control en el topbar repite esta comparación en vez de importar la constante:
 * webpack inlinea `process.env.NODE_ENV` por módulo, así que escrita ahí mismo el
 * bloque JSX se elimina del bundle de producción, y a través del import no.
 */
export const PREVIEW_ROL = process.env.NODE_ENV !== "production"

export function AppProvider({ data, me, children }: { data: AppData; me: SesionUsuario; children: ReactNode }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const [viewPref, setViewPref] = usePersistedState<"0" | "1">(LS_VIEW, "0")
  // En producción se ignora lo guardado: un `dgrd_view_as_regular=1` que quedara en
  // localStorage dejaría al admin sin el grupo "Administración" y sin forma de revertirlo.
  const viewAsRegular = PREVIEW_ROL && viewPref === "1"
  const setViewAsRegular = useCallback((v: boolean) => setViewPref(v ? "1" : "0"), [setViewPref])

  const nav = useCallback(
    (r: Route) => {
      router.push(routeToPath(r))
    },
    [router],
  )

  const run = useCallback(
    async <T,>(fn: () => Promise<ActionResult<T>>, ok?: ToastInput): Promise<T | null> => {
      setBusy(true)
      try {
        const res = await fn()
        if (!res.ok) {
          toast({ kind: "danger", title: "No se pudo completar", text: res.error })
          return null
        }
        if (ok) toast(ok)
        router.refresh()
        return res.data
      } catch (e) {
        toast({ kind: "danger", title: "Error", text: e instanceof Error ? e.message : "Error inesperado" })
        return null
      } finally {
        setBusy(false)
      }
    },
    [router, toast],
  )

  const value = useMemo<AppCtxValue>(() => {
    const { tiposEvento, insumos, eventos, solicitudes, entregas, acciones, actividades, usuarios } = data

    const evento = (id: string) => eventos.find((x) => x.id === id)
    const solicitud = (id: string) => solicitudes.find((x) => x.id === id)

    return {
      data,
      me,
      realAdmin: me.rol === "admin",
      isAdmin: me.rol === "admin" && !viewAsRegular,
      viewAsRegular,
      setViewAsRegular,
      canEdit: true,
      nav,
      toast,
      run,
      busy,

      tipoNombre: (id) => tiposEvento.find((t) => t.id === id)?.nombre ?? "—",
      insumo: (id) => insumos.find((x) => x.id === id),
      evento,
      solicitud,
      user: (id) => usuarios.find((x) => x.id === id),
      accion: (id) => acciones.find((a) => a.id === id),
      actividad: (id) => actividades.find((a) => a.id === id),

      entregaDeSolicitud: (sid) => entregas.find((en) => en.solicitudId === sid),
      entregasDeSolicitud: (sid) => entregas.filter((en) => en.solicitudId === sid),
      // El evento de una entrega se hereda de su solicitud (fuente única de verdad).
      eventoDeEntrega: (en) => {
        const s = en.solicitudId ? solicitud(en.solicitudId) : undefined
        return s?.eventoId ? evento(s.eventoId) : undefined
      },
      entregasDeEvento: (eid) =>
        entregas.filter((en) => {
          const s = en.solicitudId ? solicitud(en.solicitudId) : undefined
          return s ? s.eventoId === eid : false
        }),
      solicitudesDeEvento: (eid) => solicitudes.filter((s) => s.eventoId === eid),
      entregasConInsumo: (iid) => entregas.filter((en) => en.items.some((it) => it.insumoId === iid)),
      actividadesDeAccion: (aid) => actividades.filter((a) => a.accionId === aid),
    }
  }, [data, me, viewAsRegular, setViewAsRegular, nav, toast, run, busy])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
