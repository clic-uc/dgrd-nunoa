"use client"

/* ============================================================
   Cronograma — Plan RRD — portado de src/cronograma.jsx
   Vista temporal: acciones como barras (inicio→término) y
   actividades como puntos sobre la línea de tiempo del año.
   ============================================================ */
import { useState } from "react"
import { Badge, EmptyState, PageHead } from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, parseISO } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { SectionTabs } from "@/components/app/section-tabs"
import type { Actividad } from "@/lib/types"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MESES_L = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

/** Posición de una fecha dentro del año, en porcentaje del ancho. */
function cronoPct(dateStr: string, year: number): number | null {
  const d = parseISO(dateStr)
  if (!d) return null
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  return Math.max(0, Math.min(100, ((d.getTime() - start) / (end - start)) * 100))
}

export function CronogramaView() {
  const app = useApp()
  const { acciones, actividades } = app.data

  const anios = [...new Set(acciones.map((a) => a.anio))].sort((a, b) => b - a)
  const hoy = new Date()
  const [anio, setAnio] = useState(
    anios.includes(hoy.getFullYear()) ? hoy.getFullYear() : (anios[0] ?? hoy.getFullYear()),
  )
  const [tab, setTab] = useState<"gantt" | "actividades">("gantt")

  const rows = acciones.filter((a) => a.anio === anio).sort((a, b) => a.numero - b.numero)

  const actsAnio = actividades
    .filter((act) => {
      const d = parseISO(act.fecha)
      return d && d.getFullYear() === anio
    })
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))

  const todayPct = hoy.getFullYear() === anio ? cronoPct(hoy.toISOString().slice(0, 10), anio) : null

  const porMes = MESES_L.map((nombre, m) => ({
    mes: m,
    nombre,
    items: actsAnio.filter((act) => parseISO(act.fecha)!.getMonth() === m),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={<SectionTabs group="plan" active="cronograma" />}
        title="Cronograma"
        sub="Línea de tiempo anual: cada acción estratégica como barra entre su inicio y término, con sus actividades marcadas en la fecha en que se realizaron."
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            {anios.map((y) => (
              <button
                key={y}
                className={`btn btn--sm ${y === anio ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setAnio(y)}
              >
                <span className="mono">{y}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="panel">
        <div className="panel__head">
          <div className="seg" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "gantt"}
              className={tab === "gantt" ? "on" : ""}
              onClick={() => setTab("gantt")}
            >
              <I.Calendar size={14} /> Línea de tiempo {anio} <span className="count-pill">{rows.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "actividades"}
              className={tab === "actividades" ? "on" : ""}
              onClick={() => setTab("actividades")}
            >
              <I.Activity size={14} /> Actividades del año <span className="count-pill">{actsAnio.length}</span>
            </button>
          </div>
          {tab === "gantt" && (
            <div className="panel__actions">
              <span className="gantt-legend">
                <span className="gantt-legend__item">
                  <span className="gantt-legend__bar"></span> Período de la acción
                </span>
                <span className="gantt-legend__item">
                  <span className="gantt-legend__dot"></span> Actividad
                </span>
                <span className="gantt-legend__item">
                  <span className="gantt-legend__dot gantt-legend__dot--cluster">2</span> Varias en fechas cercanas
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="panel__body--flush">
          {tab === "gantt" ? (
            rows.length === 0 ? (
              <EmptyState
                icon={<I.Calendar />}
                title={`Sin acciones en ${anio}`}
                text="No hay acciones estratégicas registradas para este año."
              />
            ) : (
              <div className="gantt">
                <div className="gantt-grid gantt-grid--head">
                  <div className="gantt-corner">Acción estratégica</div>
                  <div className="gantt-track gantt-track--head">
                    <div className="gantt-months">
                      {MESES.map((m) => (
                        <span key={m} className="gantt-month">
                          {m}
                        </span>
                      ))}
                    </div>
                    {todayPct != null && (
                      <span className="gantt-today-pill" style={{ left: `${todayPct}%` }}>
                        Hoy
                      </span>
                    )}
                  </div>
                </div>

                {rows.map((a) => {
                  const i0 = cronoPct(a.fechaInicio, anio) ?? 0
                  const i1 = cronoPct(a.fechaTermino, anio) ?? 100
                  const acts = app.actividadesDeAccion(a.id).filter((act) => {
                    const d = parseISO(act.fecha)
                    return d && d.getFullYear() === anio
                  })

                  // Agrupa puntos cuyas fechas caen muy juntas para que no se aplasten.
                  const pts = acts
                    .map((act) => ({ act, p: cronoPct(act.fecha, anio) }))
                    .filter((o): o is { act: Actividad; p: number } => o.p != null)
                    .sort((x, y) => x.p - y.p)
                  const TH = 2.4
                  const clusters: { p: number; items: Actividad[] }[] = []
                  for (const o of pts) {
                    const last = clusters[clusters.length - 1]
                    if (last && o.p - last.p <= TH) last.items.push(o.act)
                    else clusters.push({ p: o.p, items: [o.act] })
                  }

                  return (
                    <div key={a.id} className="gantt-grid gantt-row">
                      <div className="gantt-label" onClick={() => app.nav({ name: "accion", id: a.id })}>
                        <span className="gantt-label__num mono">N°{a.numero}</span>
                        <span className="gantt-label__txt">
                          <span className="gantt-label__title">{a.titulo}</span>
                          <span className="gantt-label__meta mono">
                            {fmtDate(a.fechaInicio)} – {fmtDate(a.fechaTermino)}
                          </span>
                        </span>
                      </div>
                      <div className="gantt-track">
                        {todayPct != null && <span className="gantt-today" style={{ left: `${todayPct}%` }}></span>}
                        <span
                          className="gantt-bar"
                          style={{ left: `${i0}%`, width: `${Math.max(i1 - i0, 0.8)}%` }}
                          title={`${a.titulo} · ${fmtDate(a.fechaInicio)} – ${fmtDate(a.fechaTermino)}`}
                          onClick={() => app.nav({ name: "accion", id: a.id })}
                        ></span>
                        {clusters.map((c, idx) => {
                          const multi = c.items.length > 1
                          return (
                            <span
                              key={idx}
                              className={`gantt-dot ${multi ? "gantt-dot--cluster" : ""}`}
                              style={{ left: `${c.p}%` }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (multi) app.nav({ name: "accion", id: a.id })
                                else app.nav({ name: "actividad", id: c.items[0].id })
                              }}
                            >
                              {multi && <span className="gantt-dot__n mono">{c.items.length}</span>}
                              <span className={`gantt-tip ${c.p > 78 ? "gantt-tip--left" : ""}`}>
                                {multi ? (
                                  <>
                                    <b className="mono">{c.items.length} actividades</b>
                                    {c.items.slice(0, 5).map((it) => (
                                      <span key={it.id} className="gantt-tip__line">
                                        <b className="mono">{fmtDate(it.fecha)}</b> · {it.objetivo}
                                      </span>
                                    ))}
                                    {c.items.length > 5 && (
                                      <span className="gantt-tip__foot">
                                        +{c.items.length - 5} más · clic para ver la acción
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <b className="mono">{fmtDate(c.items[0].fecha)}</b>
                                    <span>{c.items[0].objetivo}</span>
                                  </>
                                )}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : actsAnio.length === 0 ? (
            <EmptyState
              icon={<I.Activity />}
              title={`Sin actividades en ${anio}`}
              text="Las actividades que registres en las acciones de este año aparecerán aquí, ordenadas por fecha."
            />
          ) : (
            porMes.map((g) => (
              <div key={g.mes}>
                <div className="agenda-month">
                  <span>{g.nombre}</span>
                  <span className="agenda-month__count mono">{g.items.length}</span>
                </div>
                {g.items.map((act) => {
                  const a = app.accion(act.accionId)
                  const nEv = act.evidencia.length
                  const d = parseISO(act.fecha)!
                  return (
                    <div key={act.id} className="subrow" onClick={() => app.nav({ name: "actividad", id: act.id })}>
                      <span className="agenda-date">
                        <span className="agenda-date__day mono">{String(d.getDate()).padStart(2, "0")}</span>
                        <span className="agenda-date__mon">{MESES[d.getMonth()]}</span>
                      </span>
                      <span className="subrow__main">
                        <span
                          className="subrow__title"
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {act.objetivo}
                        </span>
                        <span className="subrow__meta">
                          {a && (
                            <>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <I.Target size={12} /> Acción N°{a.numero}
                              </span>
                              <span className="dot-sep">·</span>
                            </>
                          )}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <I.MapPin size={12} /> {act.direccion}
                          </span>
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
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
