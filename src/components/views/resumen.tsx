"use client"

/* ============================================================
   Resumen — Panorama general — portado de src/resumen.jsx
   Versión acotada de cada vista del sistema en una sola pantalla.
   ============================================================ */
import type { ReactNode } from "react"
import { Badge, PageHead } from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, todayISO } from "@/lib/format"
import { useApp, type Route } from "@/components/app/provider"
import { tipoVariant } from "./eventos"
import { EstadoBadge } from "./solicitudes"

function Kpi({
  icon,
  value,
  label,
  sub,
  onClick,
  accent,
}: {
  icon: ReactNode
  value: ReactNode
  label: string
  sub?: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button className="kpi" onClick={onClick}>
      <div className="kpi__top">
        <span className={`kpi__ico ${accent ? "kpi__ico--yellow" : ""}`}>{icon}</span>
        <I.ArrowRight size={15} className="kpi__go" />
      </div>
      <div>
        <div className="kpi__v">{value}</div>
        <div className="kpi__k">{label}</div>
      </div>
      {sub && <div className="kpi__sub">{sub}</div>}
    </button>
  )
}

function SumCard({
  icon,
  title,
  count,
  onAll,
  allLabel = "Ver todo",
  children,
  foot,
  order,
}: {
  icon: ReactNode
  title: string
  count?: number
  onAll: () => void
  allLabel?: string
  children: ReactNode
  foot?: ReactNode
  order?: number
}) {
  return (
    <div className="panel resumen-card" style={order ? { order } : undefined}>
      <div className="panel__head">
        <h2>
          {icon} {title} {count != null && <span className="count-pill">{count}</span>}
        </h2>
        <div className="panel__actions">
          <button className="see-all" onClick={onAll}>
            {allLabel} <I.ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="panel__body--flush">{children}</div>
      {foot}
    </div>
  )
}

function SumEmpty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="resumen-empty">
      {icon}
      <span>{text}</span>
    </div>
  )
}

export function ResumenView() {
  const app = useApp()
  const { eventos, solicitudes, entregas, insumos, acciones, actividades } = app.data

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length
  const totalUnidades = entregas.reduce((acc, en) => acc + en.items.reduce((a, i) => a + i.cantidad, 0), 0)
  const txtPend = `${pendientes} ${pendientes === 1 ? "solicitud pendiente" : "solicitudes pendientes"} de atención`

  const topEventos = [...eventos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 4)

  const topSolicitudes = [...solicitudes]
    .sort((a, b) => {
      const pa = a.estado === "pendiente" ? 0 : 1
      const pb = b.estado === "pendiente" ? 0 : 1
      if (pa !== pb) return pa - pb
      return a.creado < b.creado ? 1 : -1
    })
    .slice(0, 4)

  const topEntregas = [...entregas].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 4)

  const topInsumos = insumos
    .map((x) => ({
      x,
      total: entregas.reduce((a, en) => a + (en.items.find((i) => i.insumoId === x.id)?.cantidad ?? 0), 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)

  const topAcciones = [...acciones].sort((a, b) => b.anio - a.anio || a.numero - b.numero).slice(0, 4)

  const today = todayISO()
  const agenda = [...actividades]
    .map((a) => ({ a, fut: a.fecha >= today }))
    .sort((p, q) => {
      // próximas primero (asc), luego recientes (desc)
      if (p.fut !== q.fut) return p.fut ? -1 : 1
      if (p.fut) return p.a.fecha < q.a.fecha ? -1 : 1
      return p.a.fecha < q.a.fecha ? 1 : -1
    })
    .slice(0, 4)
    .map((o) => o.a)

  const go = (name: Route["name"], id?: string) => app.nav(id ? { name, id } : { name })

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="General"
        title="Resumen"
        sub="Vista general del sistema: lo esencial de cada módulo en un solo lugar."
      />
      <div className="resumen-kpis">
        <Kpi
          accent
          icon={<I.Truck size={17} />}
          value={entregas.length}
          label="Entregas"
          sub={`${totalUnidades} unidades`}
          onClick={() => go("entregas")}
        />
        <Kpi
          icon={<I.Activity size={17} />}
          value={actividades.length}
          label="Actividades"
          onClick={() => go("cronograma")}
        />
        <Kpi
          icon={<I.FileText size={17} />}
          value={solicitudes.length}
          label="Solicitudes"
          sub={`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`}
          onClick={() => go("solicitudes")}
        />
        <Kpi icon={<I.Siren size={17} />} value={eventos.length} label="Eventos" onClick={() => go("eventos")} />
      </div>

      <div className="resumen-grid">
        <SumCard
          icon={<I.Truck size={16} />}
          title="Entregas recientes"
          count={entregas.length}
          onAll={() => go("entregas")}
          order={1}
          foot={
            <div className="resumen-foot">
              <I.Box size={14} /> {insumos.length} insumos en catálogo · {totalUnidades} unidades distribuidas
            </div>
          }
        >
          {topEntregas.length === 0 ? (
            <SumEmpty icon={<I.Truck size={20} />} text="Sin entregas registradas." />
          ) : (
            topEntregas.map((en) => (
              <div key={en.id} className="subrow" onClick={() => go("entrega", en.id)}>
                <span className="subrow__lead" style={{ background: "var(--green-50)", color: "var(--green)" }}>
                  <I.Truck size={16} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title subrow__title--clip">{en.beneficiario}</span>
                  <span className="subrow__meta">
                    <span className="mono">{en.folio}</span>
                    <span className="dot-sep">·</span>
                    {fmtDate(en.fecha)}
                    <span className="dot-sep">·</span>
                    {en.jv}
                  </span>
                </span>
                <Badge variant="neutral">
                  {en.items.length} {en.items.length === 1 ? "insumo" : "insumos"}
                </Badge>
                <I.ChevronRight size={16} className="subrow__chev" />
              </div>
            ))
          )}
        </SumCard>

        <SumCard
          icon={<I.Box size={16} />}
          title="Insumos más distribuidos"
          count={insumos.length}
          onAll={() => go("insumos")}
          order={2}
        >
          {topInsumos.length === 0 ? (
            <SumEmpty icon={<I.Box size={20} />} text="Aún no hay insumos distribuidos." />
          ) : (
            topInsumos.map(({ x, total }) => (
              <div key={x.id} className="subrow" onClick={() => go("insumo", x.id)}>
                <span className="subrow__lead">
                  <I.Box size={16} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title">{x.tipo}</span>
                  <span className="subrow__meta">
                    Unidad: <span className="tag">{x.unidad}</span>
                  </span>
                </span>
                <span className="resumen-metric">
                  <b className="mono">{total}</b> {x.unidad}
                </span>
                <I.ChevronRight size={16} className="subrow__chev" />
              </div>
            ))
          )}
        </SumCard>

        <SumCard
          icon={<I.Target size={16} />}
          title="Acciones estratégicas"
          count={acciones.length}
          onAll={() => go("acciones")}
          order={3}
        >
          {topAcciones.length === 0 ? (
            <SumEmpty icon={<I.Target size={20} />} text="Sin acciones del Plan RRD." />
          ) : (
            topAcciones.map((a) => {
              const n = app.actividadesDeAccion(a.id).length
              return (
                <div key={a.id} className="subrow" onClick={() => go("accion", a.id)}>
                  <span className="subrow__lead" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
                    <I.Target size={16} />
                  </span>
                  <span className="subrow__main">
                    <span className="subrow__title subrow__title--clip">{a.titulo}</span>
                    <span className="subrow__meta">
                      <span className="mono">
                        N°{a.numero} · {a.anio}
                      </span>
                      <span className="dot-sep">·</span>
                      {fmtDate(a.fechaInicio)} – {fmtDate(a.fechaTermino)}
                    </span>
                  </span>
                  <Badge variant="neutral">
                    {n} {n === 1 ? "actividad" : "actividades"}
                  </Badge>
                  <I.ChevronRight size={16} className="subrow__chev" />
                </div>
              )
            })
          )}
        </SumCard>

        <SumCard
          icon={<I.Calendar size={16} />}
          title="Cronograma · próximas actividades"
          count={actividades.length}
          onAll={() => go("cronograma")}
          allLabel="Ver línea de tiempo"
          order={4}
        >
          {agenda.length === 0 ? (
            <SumEmpty icon={<I.Calendar size={20} />} text="Sin actividades en agenda." />
          ) : (
            agenda.map((act) => {
              const a = app.accion(act.accionId)
              const nEv = act.evidencia.length
              return (
                <div key={act.id} className="subrow" onClick={() => go("actividad", act.id)}>
                  <span className="subrow__lead">
                    <I.Activity size={16} />
                  </span>
                  <span className="subrow__main">
                    <span className="subrow__title subrow__title--clip">{act.objetivo}</span>
                    <span className="subrow__meta">
                      <span className="mono">{fmtDate(act.fecha)}</span>
                      {a && (
                        <>
                          <span className="dot-sep">·</span>Acción N°{a.numero}
                        </>
                      )}
                    </span>
                  </span>
                  {nEv > 0 ? (
                    <Badge variant="yellow">
                      <I.Paperclip size={12} /> {nEv}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Sin evidencia</Badge>
                  )}
                  <I.ChevronRight size={16} className="subrow__chev" />
                </div>
              )
            })
          )}
        </SumCard>

        <SumCard
          icon={<I.FileText size={16} />}
          title="Solicitudes"
          count={solicitudes.length}
          onAll={() => go("solicitudes")}
          order={5}
          foot={
            <div className="resumen-foot">
              <I.AlertCircle size={14} /> {txtPend}
            </div>
          }
        >
          {topSolicitudes.length === 0 ? (
            <SumEmpty icon={<I.FileText size={20} />} text="Sin solicitudes registradas." />
          ) : (
            topSolicitudes.map((s) => (
              <div key={s.id} className="subrow" onClick={() => go("solicitud", s.id)}>
                <span className="subrow__lead">
                  <I.FileText size={16} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title subrow__title--clip">{s.medio}</span>
                  <span className="subrow__meta">
                    <span className="mono">{s.folio}</span>
                    <span className="dot-sep">·</span>
                    {fmtDate(s.creado)}
                  </span>
                </span>
                <EstadoBadge value={s.estado} respuesta={s.respuesta} />
                <I.ChevronRight size={16} className="subrow__chev" />
              </div>
            ))
          )}
        </SumCard>

        <SumCard
          icon={<I.Siren size={16} />}
          title="Eventos recientes"
          count={eventos.length}
          onAll={() => go("eventos")}
          order={6}
        >
          {topEventos.length === 0 ? (
            <SumEmpty icon={<I.Siren size={20} />} text="Sin eventos registrados." />
          ) : (
            topEventos.map((e) => {
              const nombre = app.tipoNombre(e.tipoId)
              return (
                <div key={e.id} className="subrow" onClick={() => go("evento", e.id)}>
                  <span className="subrow__lead" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
                    <I.Siren size={16} />
                  </span>
                  <span className="subrow__main">
                    <span className="subrow__title">{e.sector}</span>
                    <span className="subrow__meta">
                      <span className="mono">{e.folio}</span>
                      <span className="dot-sep">·</span>
                      {nombre}
                      <span className="dot-sep">·</span>
                      {fmtDate(e.fecha)}
                    </span>
                  </span>
                  <Badge variant={tipoVariant(nombre)} dot>
                    {nombre}
                  </Badge>
                  <I.ChevronRight size={16} className="subrow__chev" />
                </div>
              )
            })
          )}
        </SumCard>
      </div>
    </div>
  )
}
