"use client"

/* ============================================================
   App shell — Sidebar + Topbar (portado de src/layout.jsx)
   ============================================================ */
import { Fragment, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Badge, useClickOutside, usePersistedState } from "@/components/kit"
import { I, type IconProps } from "@/components/icons"
import { initials } from "@/lib/format"
import { signOut } from "@/lib/auth-client"
import { useApp, type Route, type RouteName } from "./provider"
import { pathToRoute } from "./route"

type NavItem = {
  key: RouteName
  label: string
  icon: (p: IconProps) => ReactNode
  countKey?: "solicitudes" | "eventos" | "entregas" | "insumos" | "acciones"
  match?: RouteName[]
}

const NAV_GROUPS: { label: string; admin?: boolean; items: NavItem[] }[] = [
  {
    label: "General",
    items: [{ key: "resumen", label: "Resumen", icon: I.Home }],
  },
  {
    label: "Emergencias",
    items: [
      {
        key: "solicitudes",
        label: "Solicitudes",
        icon: I.FileText,
        countKey: "solicitudes",
        match: ["solicitudes", "solicitud"],
      },
      { key: "eventos", label: "Eventos", icon: I.Siren, countKey: "eventos", match: ["eventos", "evento"] },
    ],
  },
  {
    label: "Ayudas primera respuesta",
    items: [
      {
        key: "entregas",
        label: "Entregas",
        icon: I.Truck,
        countKey: "entregas",
        match: ["entregas", "entrega", "insumos", "insumo"],
      },
    ],
  },
  {
    label: "Plan RRD",
    items: [
      {
        key: "cronograma",
        label: "Cronograma",
        icon: I.Calendar,
        match: ["cronograma", "acciones", "accion", "actividad"],
      },
    ],
  },
  {
    label: "Administración",
    admin: true,
    items: [
      { key: "usuarios", label: "Usuarios", icon: I.Users },
      { key: "config", label: "Configuración", icon: I.Settings },
    ],
  },
]

const LS_COLLAPSED = "dgrd_sidebar_collapsed"

export function AppShell({ children }: { children: ReactNode }) {
  const app = useApp()
  const pathname = usePathname()
  const route = pathToRoute(pathname)

  const [collapsedPref, setCollapsedPref] = usePersistedState<"0" | "1">(LS_COLLAPSED, "0")
  const collapsed = collapsedPref === "1"
  const toggleCollapsed = () => setCollapsedPref(collapsed ? "0" : "1")

  const counts = {
    solicitudes: app.data.solicitudes.length,
    eventos: app.data.eventos.length,
    entregas: app.data.entregas.length,
    insumos: app.data.insumos.length,
    acciones: app.data.acciones.length,
  }

  const crumbs = useCrumbs(route)

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} route={route} counts={counts} isAdmin={app.isAdmin} />
      <div className="main">
        <Topbar crumbs={crumbs} />
        <div className="content scroll" data-screen-label={route.name}>
          <div className="content__inner">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Sidebar({
  collapsed,
  onToggle,
  route,
  counts,
  isAdmin,
}: {
  collapsed: boolean
  onToggle: () => void
  route: Route
  counts: Record<string, number>
  isAdmin: boolean
}) {
  const app = useApp()
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sb-head">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático servido desde /public */}
        <img className="sb-head__mark" src="/logo-mark-yellow.svg" alt="Ñuñoa" />
        {!collapsed && (
          <div className="sb-head__txt">
            <b>Dirección de Gestión de Riesgo y Desastres</b>
            <span>Municipalidad de Ñuñoa</span>
          </div>
        )}
      </div>

      <nav className="sb-nav scroll">
        {NAV_GROUPS.map((g) => {
          if (g.admin && !isAdmin) return null
          return (
            <div className="nav-group" key={g.label}>
              <div className="nav-group__label">{g.label}</div>
              {g.items.map((it) => {
                const active = (it.match ?? [it.key]).includes(route.name)
                const Icon = it.icon
                const count = it.countKey ? counts[it.countKey] : null
                return (
                  <button
                    key={it.key}
                    className={`nav-item ${active ? "nav-item--active" : ""}`}
                    onClick={() => app.nav({ name: it.key })}
                    title={collapsed ? it.label : undefined}
                  >
                    <Icon className="nav-item__icon" />
                    <span className="nav-item__label">{it.label}</span>
                    {count != null && <span className="nav-item__count">{count}</span>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sb-foot">
        <button className="sb-collapse" onClick={onToggle} title={collapsed ? "Expandir" : "Contraer"}>
          {collapsed ? <I.ChevronRight size={18} /> : <I.ChevronsLeft size={18} />}
          <span>Contraer menú</span>
        </button>
      </div>
    </aside>
  )
}

type Crumb = { label: string; route?: Route }

function useCrumbs(route: Route): Crumb[] {
  const app = useApp()
  const { solicitudes, entregas } = app.data

  switch (route.name) {
    case "resumen":
      return [{ label: "Resumen" }]
    case "solicitudes":
      return [{ label: "Emergencias" }, { label: "Solicitudes" }]
    case "solicitud": {
      const s = solicitudes.find((x) => x.id === route.id)
      return [
        { label: "Emergencias" },
        { label: "Solicitudes", route: { name: "solicitudes" } },
        { label: s?.folio ?? "Detalle" },
      ]
    }
    case "eventos":
      return [{ label: "Emergencias" }, { label: "Eventos" }]
    case "evento": {
      const e = app.evento(route.id ?? "")
      return [
        { label: "Emergencias" },
        { label: "Eventos", route: { name: "eventos" } },
        { label: e?.folio ?? "Detalle" },
      ]
    }
    case "entregas":
      return [{ label: "Ayudas primera respuesta" }, { label: "Entregas" }]
    case "entrega": {
      const en = entregas.find((x) => x.id === route.id)
      const e = en ? app.eventoDeEntrega(en) : undefined
      const so = en?.solicitudId ? app.solicitud(en.solicitudId) : undefined
      if (e)
        return [
          { label: "Emergencias" },
          { label: "Eventos", route: { name: "eventos" } },
          { label: e.folio, route: { name: "evento", id: e.id } },
          { label: en?.folio ?? "Entrega" },
        ]
      if (so)
        return [
          { label: "Emergencias" },
          { label: "Solicitudes", route: { name: "solicitudes" } },
          { label: so.folio, route: { name: "solicitud", id: so.id } },
          { label: en?.folio ?? "Entrega" },
        ]
      return [
        { label: "Ayudas primera respuesta" },
        { label: "Entregas", route: { name: "entregas" } },
        { label: en?.folio ?? "Entrega" },
      ]
    }
    case "insumos":
      return [{ label: "Ayudas primera respuesta" }, { label: "Insumos" }]
    case "insumo": {
      const x = app.insumo(route.id ?? "")
      return [
        { label: "Ayudas primera respuesta" },
        { label: "Insumos", route: { name: "insumos" } },
        { label: x?.tipo ?? "Detalle" },
      ]
    }
    case "acciones":
      return [{ label: "Plan RRD" }, { label: "Acciones estratégicas" }]
    case "cronograma":
      return [{ label: "Plan RRD" }, { label: "Cronograma" }]
    case "accion": {
      const a = app.accion(route.id ?? "")
      return [
        { label: "Plan RRD" },
        { label: "Acciones estratégicas", route: { name: "acciones" } },
        { label: a ? `N°${a.numero} · ${a.anio}` : "Detalle" },
      ]
    }
    case "actividad": {
      const ac = app.actividad(route.id ?? "")
      const a = ac ? app.accion(ac.accionId) : undefined
      if (a)
        return [
          { label: "Plan RRD" },
          { label: "Acciones estratégicas", route: { name: "acciones" } },
          { label: `N°${a.numero} · ${a.anio}`, route: { name: "accion", id: a.id } },
          { label: "Actividad" },
        ]
      return [{ label: "Plan RRD" }, { label: "Actividad" }]
    }
    case "usuarios":
      return [{ label: "Administración" }, { label: "Usuarios" }]
    case "config":
      return [{ label: "Administración" }, { label: "Configuración" }]
    default:
      return [{ label: "DGRD" }]
  }
}

function Topbar({ crumbs }: { crumbs: Crumb[] }) {
  const app = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  const effectiveRole = app.isAdmin ? "Administrador" : "Usuario regular"

  const cerrarSesion = async () => {
    setSaliendo(true)
    await signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <header className="topbar">
      <div className="topbar__crumb">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <I.ChevronRight size={14} />}
            {c.route && i < crumbs.length - 1 ? (
              <button
                className="link"
                style={{ color: "var(--muted)", fontWeight: 500 }}
                onClick={() => app.nav(c.route!)}
              >
                {c.label}
              </button>
            ) : i === crumbs.length - 1 ? (
              <b style={{ fontSize: "13px" }}>{c.label}</b>
            ) : (
              <span>{c.label}</span>
            )}
          </Fragment>
        ))}
      </div>

      <div className="topbar__spacer" />

      {/* Solo en desarrollo — ver PREVIEW_ROL en ./provider. */}
      {process.env.NODE_ENV !== "production" && app.realAdmin && (
        <div className="role-toggle" title="Previsualizar la interfaz según el rol">
          <button className={!app.viewAsRegular ? "on" : ""} onClick={() => app.setViewAsRegular(false)}>
            Vista admin
          </button>
          <button className={app.viewAsRegular ? "on" : ""} onClick={() => app.setViewAsRegular(true)}>
            Vista usuario
          </button>
        </div>
      )}

      <div className="user-menu" ref={ref}>
        <button className="user-btn" onClick={() => setOpen((o) => !o)}>
          <span className="avatar">{initials(app.me.nombre, app.me.apellido)}</span>
          <span style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.15 }}>
            <span className="user-btn__name">
              {app.me.nombre} {app.me.apellido}
            </span>
            <span className="user-btn__role">{effectiveRole}</span>
          </span>
          <I.ChevronDown size={15} style={{ color: "var(--slate-400)" }} />
        </button>
        {open && (
          <div className="menu-pop">
            <div className="menu-pop__head">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="avatar avatar--lg">{initials(app.me.nombre, app.me.apellido)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {app.me.nombre} {app.me.apellido}
                  </div>
                  <div
                    className="muted mono"
                    style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {app.me.correo}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <Badge variant={app.realAdmin ? "yellow" : "neutral"} dot>
                  {app.realAdmin ? "Administrador" : "Usuario regular"}
                </Badge>
              </div>
            </div>
            <button className="menu-item menu-item--danger" onClick={cerrarSesion} disabled={saliendo}>
              <I.LogOut size={16} /> {saliendo ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
