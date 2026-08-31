"use client"

/* ============================================================
   Entregas — portado de src/entregas.jsx
   Listado por periodo + filtros avanzados, form y detalle
   ============================================================ */
import { useState } from "react"
import {
  Badge,
  ConfirmDialog,
  DrawerShell,
  EmptyState,
  Field,
  Input,
  KV,
  Modal,
  PageHead,
  SearchBox,
  Select,
  useClickOutside,
} from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, fmtDateLong, fmtDateTime, initials, todayISO } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { SectionTabs } from "@/components/app/section-tabs"
import { crearEntrega, editarEntrega, eliminarEntrega } from "@/server/actions/emergencias"
import { agruparInsumos, etiquetaInsumo } from "@/lib/insumos"
import type { Entrega } from "@/lib/types"

/* ---------------- Presets de periodo ---------------- */
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function periodoPreset(key: "mes" | "30" | "anio"): [string, string] {
  const hoy = new Date()
  const fin = isoDay(hoy)
  if (key === "mes") return [isoDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin]
  if (key === "30") {
    const d = new Date(hoy)
    d.setDate(d.getDate() - 29)
    return [isoDay(d), fin]
  }
  return [isoDay(new Date(hoy.getFullYear(), 0, 1)), fin]
}

/* ---------------- List ---------------- */
export function EntregasList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [eventoFiltro, setEventoFiltro] = useState<"todas" | "con" | "sin">("todas")
  const [insumoFiltro, setInsumoFiltro] = useState("todos")
  const [orden, setOrden] = useState<"desc" | "asc">("desc")
  const [advOpen, setAdvOpen] = useState(false)
  const advRef = useClickOutside<HTMLDivElement>(() => setAdvOpen(false))
  const [form, setForm] = useState<{ mode: "create" | "edit"; data: Entrega | null } | null>(null)
  const [del, setDel] = useState<Entrega | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const insumosCat = [...app.data.insumos].sort((a, b) => a.tipo.localeCompare(b.tipo))

  const rows = app.data.entregas
    .map((en) => ({ en, ev: app.eventoDeEntrega(en) }))
    .filter(({ en }) => (desde ? en.fecha >= desde : true))
    .filter(({ en }) => (hasta ? en.fecha <= hasta : true))
    .filter(({ ev }) => (eventoFiltro === "todas" ? true : eventoFiltro === "con" ? !!ev : !ev))
    .filter(({ en }) => (insumoFiltro === "todos" ? true : en.items.some((it) => it.insumoId === insumoFiltro)))
    .filter(({ en, ev }) => {
      const t = (
        en.folio +
        " " +
        en.beneficiario +
        " " +
        en.jv +
        " " +
        en.direccion +
        " " +
        (ev?.folio ?? "")
      ).toLowerCase()
      return t.includes(q.toLowerCase())
    })
    .sort((a, b) => (orden === "asc" ? (a.en.fecha < b.en.fecha ? -1 : 1) : a.en.fecha < b.en.fecha ? 1 : -1))

  const totalUnidades = rows.reduce((acc, { en }) => acc + en.items.reduce((s, it) => s + (it.cantidad || 0), 0), 0)

  const advCount = (eventoFiltro !== "todas" ? 1 : 0) + (insumoFiltro !== "todos" ? 1 : 0) + (orden !== "desc" ? 1 : 0)
  const periodoActivo = !!desde || !!hasta
  const hayFiltros = periodoActivo || advCount > 0 || !!q
  const limpiarTodo = () => {
    setDesde("")
    setHasta("")
    setEventoFiltro("todas")
    setInsumoFiltro("todos")
    setOrden("desc")
    setQ("")
  }
  const setPreset = (k: "mes" | "30" | "anio") => {
    const [d, h] = periodoPreset(k)
    setDesde(d)
    setHasta(h)
  }
  const presetActivo = (k: "mes" | "30" | "anio") => {
    const [d, h] = periodoPreset(k)
    return desde === d && hasta === h
  }

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={<SectionTabs group="ayudas" active="entregas" />}
        title="Entregas"
        sub="Todas las entregas de insumos registradas. Acota por periodo y afina con filtros avanzados."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ mode: "create", data: null })}>
            <I.Plus size={16} /> Registrar entrega
          </button>
        }
      />

      <div className="toolbar">
        <div className="period-field" title="Acota las entregas a un periodo de tiempo">
          <I.Calendar size={15} className="period-field__icon" />
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            aria-label="Desde"
          />
          <span className="period-field__sep">→</span>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            aria-label="Hasta"
          />
          {periodoActivo && (
            <button
              className="period-field__clear"
              title="Limpiar periodo"
              onClick={() => {
                setDesde("")
                setHasta("")
              }}
            >
              <I.X size={13} />
            </button>
          )}
        </div>
        <div className="seg" title="Periodos rápidos">
          <button className={presetActivo("mes") ? "on" : ""} onClick={() => setPreset("mes")}>
            Este mes
          </button>
          <button className={presetActivo("30") ? "on" : ""} onClick={() => setPreset("30")}>
            30 días
          </button>
          <button className={presetActivo("anio") ? "on" : ""} onClick={() => setPreset("anio")}>
            Este año
          </button>
        </div>
        <div className="toolbar__spacer" />
        <div className="filter-wrap" ref={advRef}>
          <button
            className={`icon-btn filter-trigger ${advOpen || advCount ? "is-active" : ""}`}
            title="Filtros avanzados"
            aria-label="Filtros avanzados"
            onClick={() => setAdvOpen((o) => !o)}
          >
            <I.Filter />
            {advCount > 0 && <span className="filter-trigger__badge">{advCount}</span>}
          </button>
          {advOpen && (
            <div className="menu-pop filter-menu">
              <div className="filter-menu__title">Filtros avanzados</div>
              <div className="filter-menu__group">
                <div className="filter-menu__label">Evento asociado</div>
                {(
                  [
                    ["todas", "Todas"],
                    ["con", "Con evento"],
                    ["sin", "Sin evento"],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} className="menu-item filter-opt" onClick={() => setEventoFiltro(v)}>
                    <span>{l}</span>
                    {eventoFiltro === v && <I.Check size={15} className="filter-opt__check" />}
                  </button>
                ))}
              </div>
              <div className="filter-menu__group">
                <div className="filter-menu__label">Insumo incluido</div>
                <Select value={insumoFiltro} onChange={(e) => setInsumoFiltro(e.target.value)}>
                  <option value="todos">Cualquier insumo</option>
                  {insumosCat.map((x) => (
                    <option key={x.id} value={x.id}>
                      {etiquetaInsumo(x, app.data.insumos)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="filter-menu__group">
                <div className="filter-menu__label">Ordenar por fecha</div>
                {(
                  [
                    ["desc", "Más recientes primero"],
                    ["asc", "Más antiguas primero"],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} className="menu-item filter-opt" onClick={() => setOrden(v)}>
                    <span>{l}</span>
                    {orden === v && <I.Check size={15} className="filter-opt__check" />}
                  </button>
                ))}
              </div>
              <div className="filter-menu__foot">
                <button
                  className="link"
                  disabled={!advCount}
                  onClick={() => {
                    setEventoFiltro("todas")
                    setInsumoFiltro("todos")
                    setOrden("desc")
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por folio, beneficiario o J.V.…" />
      </div>

      <div className="stat-row" style={{ marginBottom: 18, background: "var(--surface)", maxWidth: 520 }}>
        <div className="stat">
          <div className="stat__v">{rows.length}</div>
          <div className="stat__k">Entregas{periodoActivo ? " en el periodo" : ""}</div>
        </div>
        <div className="stat">
          <div className="stat__v">{totalUnidades}</div>
          <div className="stat__k">Unidades distribuidas</div>
        </div>
        <div className="stat">
          <div className="stat__v">{new Set(rows.map(({ en }) => en.jv)).size}</div>
          <div className="stat__k">Juntas vecinales</div>
        </div>
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.Truck />}
            title="No hay entregas"
            text={
              hayFiltros
                ? "No se encontraron entregas con los filtros aplicados."
                : "Aún no se han registrado entregas de insumos."
            }
            action={
              hayFiltros ? (
                <button className="btn btn--secondary" onClick={limpiarTodo}>
                  Limpiar filtros
                </button>
              ) : (
                <button className="btn btn--primary" onClick={() => setForm({ mode: "create", data: null })}>
                  <I.Plus size={16} /> Registrar entrega
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 124 }}>Folio</th>
                  <th style={{ width: 120 }}>Fecha</th>
                  <th>Beneficiario</th>
                  <th>Junta vecinal</th>
                  <th style={{ width: 150 }}>Evento</th>
                  <th className="num" style={{ width: 158 }}>
                    Insumos
                  </th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ en, ev }) => {
                  const uds = en.items.reduce((s, it) => s + (it.cantidad || 0), 0)
                  return (
                    <tr key={en.id} className="clickable" onClick={() => setDrawerId(en.id)}>
                      <td>
                        <span className="mono cell-strong">{en.folio}</span>
                      </td>
                      <td>
                        <span className="mono cell-muted">{fmtDate(en.fecha)}</span>
                      </td>
                      <td className="cell-strong">{en.beneficiario}</td>
                      <td className="cell-muted">{en.jv}</td>
                      <td>
                        {ev ? (
                          <Badge variant="yellow" dot>
                            {ev.folio}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Sin evento</Badge>
                        )}
                      </td>
                      <td className="num">
                        <span className="qty-cell">
                          <span className="count-pill">{en.items.length}</span>
                          <span className="mono cell-strong">
                            {uds} <span className="qty-cell__unit">uds</span>
                          </span>
                        </span>
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn" title="Ver" onClick={() => setDrawerId(en.id)}>
                            <I.Eye />
                          </button>
                          <button
                            className="icon-btn"
                            title="Editar"
                            onClick={() => setForm({ mode: "edit", data: en })}
                          >
                            <I.Pencil />
                          </button>
                          <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(en)}>
                            <I.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <EntregaForm mode={form.mode} data={form.data ?? undefined} onClose={() => setForm(null)} />}
      {del && <DeleteEntrega en={del} onClose={() => setDel(null)} />}
      <DrawerShell
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        eyebrow={drawerId ? (app.data.entregas.find((x) => x.id === drawerId)?.folio ?? "") : ""}
        title="Entrega"
      >
        {drawerId && <EntregaDetail id={drawerId} embedded onClose={() => setDrawerId(null)} />}
      </DrawerShell>
    </div>
  )
}

/* ---------------- Detail ---------------- */
export function EntregaDetail({ id, embedded, onClose }: { id: string; embedded?: boolean; onClose?: () => void }) {
  const app = useApp()
  const en = app.data.entregas.find((x) => x.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)

  if (!en)
    return (
      <EmptyState
        title="Entrega no encontrada"
        action={
          <button
            className="btn btn--secondary"
            onClick={() => (embedded ? onClose?.() : app.nav({ name: "entregas" }))}
          >
            Volver
          </button>
        }
      />
    )

  const sol = en.solicitudId ? app.solicitud(en.solicitudId) : null
  const ev = sol?.eventoId ? app.evento(sol.eventoId) : null
  const autor = app.user(en.creadoPor)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={<span className="mono">{en.folio}</span>}
        title="Detalle de entrega"
        sub={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <I.Calendar size={14} /> {fmtDateLong(en.fecha)}
          </span>
        }
        back={
          embedded
            ? undefined
            : {
                label: ev ? `${ev.folio} · ${ev.sector}` : sol ? `${sol.folio} · Solicitud` : "Entregas",
                onClick: () =>
                  app.nav(
                    ev ? { name: "evento", id: ev.id } : sol ? { name: "solicitud", id: sol.id } : { name: "entregas" },
                  ),
              }
        }
        actions={
          <>
            {app.canEdit && (
              <button className="btn btn--secondary" onClick={() => setForm(true)}>
                <I.Pencil size={15} /> Editar
              </button>
            )}
            {app.canEdit && (
              <button className="btn btn--ghost" onClick={() => setDel(true)} style={{ color: "var(--red)" }}>
                <I.Trash size={15} />
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <div>
          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Truck size={17} /> Datos de la entrega
              </h2>
            </div>
            <div className="panel__body">
              <div className="kv">
                <KV k="Beneficiario">{en.beneficiario}</KV>
                <KV k="Junta vecinal">{en.jv}</KV>
                <KV k="Contacto" empty={!en.contacto}>
                  {en.contacto && <span className="mono">{en.contacto}</span>}
                </KV>
                <KV k="Fecha">
                  <span className="mono">{fmtDate(en.fecha)}</span>
                </KV>
                <KV k="Dirección" full>
                  <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
                    <I.MapPin size={15} style={{ color: "var(--slate-400)" }} />
                    {en.direccion}
                  </span>
                </KV>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Box size={17} /> Insumos entregados <span className="count-pill">{en.items.length}</span>
              </h2>
            </div>
            <div className="panel__body--flush">
              <div className="table-wrap">
                <table className="table--compact table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th style={{ width: 120 }}>Unidad</th>
                      <th className="num" style={{ width: 120 }}>
                        Cantidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {en.items.map((it, i) => {
                      const ins = app.insumo(it.insumoId)
                      return (
                        <tr key={i}>
                          <td className="cell-strong">{ins?.tipo ?? "—"}</td>
                          <td>
                            <span className="unit-tag" style={{ textAlign: "left" }}>
                              {ins?.unidad}
                            </span>
                          </td>
                          <td className="num mono cell-strong">{it.cantidad}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="aside-card">
            <div className="aside-card__title">Solicitud asociada</div>
            {sol ? (
              <button
                className="subrow"
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r)",
                  textAlign: "left",
                  background: "var(--surface)",
                }}
                onClick={() => app.nav({ name: "solicitud", id: sol.id })}
              >
                <span className="subrow__lead" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
                  <I.FileText size={17} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title mono">{sol.folio}</span>
                  <span className="subrow__meta">{sol.medio}</span>
                </span>
                <I.ChevronRight size={16} className="subrow__chev" />
              </button>
            ) : (
              <div className="muted" style={{ fontSize: 12.5 }}>
                Sin solicitud asociada.
              </div>
            )}
          </div>
          <div className="aside-card">
            <div className="aside-card__title">Evento</div>
            {ev ? (
              <button
                className="subrow"
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r)",
                  textAlign: "left",
                  background: "var(--surface)",
                }}
                onClick={() => app.nav({ name: "evento", id: ev.id })}
              >
                <span className="subrow__lead" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
                  <I.Siren size={17} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title mono">{ev.folio}</span>
                  <span className="subrow__meta">
                    {app.tipoNombre(ev.tipoId)} · {ev.sector}
                  </span>
                </span>
                <I.ChevronRight size={16} className="subrow__chev" />
              </button>
            ) : (
              <div className="muted" style={{ fontSize: 12.5 }}>
                Sin evento
              </div>
            )}
          </div>
          <div className="aside-card">
            <div className="aside-card__title">Registro</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                {initials(autor?.nombre, autor?.apellido)}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {autor?.nombre} {autor?.apellido}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Registró la entrega
                </div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
              <I.Clock size={14} /> {fmtDateTime(en.creado)}
            </div>
          </div>
        </div>
      </div>

      {form && <EntregaForm mode="edit" data={en} onClose={() => setForm(false)} />}
      {del && (
        <DeleteEntrega
          en={en}
          fromDetail={!embedded}
          onDeleted={embedded ? onClose : undefined}
          onClose={() => setDel(false)}
        />
      )}
    </div>
  )
}

/* ---------------- Form con repeater de insumos ---------------- */
// El tipo se guarda aparte del id porque un tipo con varias unidades
// (Polietileno rollo/corte) se elige en dos pasos: primero el tipo y
// después la unidad, y entremedio todavía no hay insumo resuelto.
type ItemDraft = { tipo: string; insumoId: string; cantidad: string }

export function EntregaForm({
  mode,
  data,
  eventoId,
  solicitudId,
  onClose,
}: {
  mode: "create" | "edit"
  data?: Entrega
  eventoId?: string | null
  solicitudId?: string | null
  onClose: () => void
}) {
  const app = useApp()
  const lockSolicitud = solicitudId != null

  // Una entrega puede asociarse a cualquier solicitud que aún no tenga
  // entrega (más la propia, al editar).
  const freeSolicitudes = app.data.solicitudes.filter((s) => {
    const ent = app.entregaDeSolicitud(s.id)
    return !ent || ent.id === data?.id
  })
  const eventoSols = eventoId ? freeSolicitudes.filter((s) => s.eventoId === eventoId) : []
  const [solSel, setSolSel] = useState<string>(
    lockSolicitud ? solicitudId! : (data?.solicitudId ?? eventoSols[0]?.id ?? ""),
  )

  const sol = solSel ? app.solicitud(solSel) : null
  const ev = sol?.eventoId ? app.evento(sol.eventoId) : eventoId ? app.evento(eventoId) : null

  const [fecha, setFecha] = useState(data?.fecha ?? ev?.fecha ?? todayISO())
  const [direccion, setDireccion] = useState(data?.direccion ?? "")
  const [beneficiario, setBeneficiario] = useState(data?.beneficiario ?? "")
  const [contacto, setContacto] = useState(data?.contacto ?? "")
  const [jv, setJv] = useState(data?.jv ?? "")
  const [items, setItems] = useState<ItemDraft[]>(
    data?.items
      ? data.items.map((i) => ({
          tipo: app.insumo(i.insumoId)?.tipo ?? "",
          insumoId: i.insumoId,
          cantidad: String(i.cantidad),
        }))
      : [{ tipo: "", insumoId: "", cantidad: "" }],
  )
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const addItem = () => setItems([...items, { tipo: "", insumoId: "", cantidad: "" }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  const grupos = agruparInsumos(app.data.insumos)
  const grupoDe = (tipo: string) => grupos.find((g) => g.tipo === tipo)

  const validItems = items.filter((it) => it.insumoId && Number(it.cantidad) > 0)
  // Una fila con tipo pero sin unidad se caería de `validItems` en silencio.
  const faltaUnidad = items.some((it) => it.tipo && !it.insumoId)
  const errs = {
    fecha: !fecha ? "Indica la fecha." : "",
    direccion: !direccion.trim() ? "Indica la dirección." : "",
    beneficiario: !beneficiario.trim() ? "Indica el beneficiario." : "",
    jv: !jv.trim() ? "Indica la junta vecinal." : "",
    items: faltaUnidad
      ? "Elige la unidad del insumo."
      : validItems.length === 0
        ? "Agrega al menos un insumo con cantidad."
        : "",
  }
  const valid = Object.values(errs).every((e) => !e)
  const usedIds = items.map((i) => i.insumoId)

  const save = async () => {
    setTouched(true)
    if (!valid) return
    const payload = {
      solicitudId: solSel || null,
      fecha,
      direccion: direccion.trim(),
      beneficiario: beneficiario.trim(),
      contacto: contacto.trim(),
      jv: jv.trim(),
      items: validItems.map((i) => ({ insumoId: i.insumoId, cantidad: Number(i.cantidad) })),
    }
    setSaving(true)
    const res =
      mode === "create"
        ? await app.run(() => crearEntrega(payload), {
            title: "Entrega registrada",
            text: `Se registró la entrega a ${payload.beneficiario}.`,
          })
        : await app.run(() => editarEntrega(data!.id, payload), {
            title: "Cambios guardados",
            text: "Entrega actualizada.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="xl"
      onClose={onClose}
      title={mode === "create" ? "Registrar entrega" : "Editar entrega"}
      sub={
        sol ? (
          <>
            Solicitud <span className="mono">{sol.folio}</span>
            {ev ? (
              <>
                {" "}
                · Evento <span className="mono">{ev.folio}</span>
              </>
            ) : null}
          </>
        ) : ev ? (
          <>
            Evento <span className="mono">{ev.folio}</span> · {app.tipoNombre(ev.tipoId)}, {ev.sector}
          </>
        ) : null
      }
      icon={
        <div className="confirm-icon" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
          <I.Truck size={19} />
        </div>
      }
      footer={
        <>
          <div className="left muted" style={{ fontSize: 12.5 }}>
            {validItems.length} {validItems.length === 1 ? "insumo" : "insumos"} en la entrega
          </div>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Registrar entrega" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        {lockSolicitud ? (
          <div className="info-box" style={{ marginBottom: 18 }}>
            <I.FileText size={16} />
            <div>
              Entrega asociada a la solicitud <b className="mono">{sol?.folio}</b>
              {ev ? (
                <>
                  {" "}
                  · evento <b className="mono">{ev.folio}</b>
                </>
              ) : (
                <> · sin evento</>
              )}
              .
            </div>
          </div>
        ) : (
          <Field
            label="Solicitud asociada"
            optional
            hint="Opcional. Si la entrega responde a una solicitud registrada, selecciónala y el evento se heredará de ella."
          >
            <Select value={solSel} onChange={(e) => setSolSel(e.target.value)}>
              <option value="">Sin solicitud asociada</option>
              {freeSolicitudes.map((s) => {
                const sev = s.eventoId ? app.evento(s.eventoId) : null
                return (
                  <option key={s.id} value={s.id}>
                    {s.folio} — {s.medio}
                    {sev ? ` · ${sev.folio}` : " · sin evento"}
                  </option>
                )
              })}
            </Select>
          </Field>
        )}
        <div className="form-grid">
          <Field label="Fecha" required error={touched ? errs.fecha : ""}>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              invalid={touched && !!errs.fecha}
            />
          </Field>
          <Field label="Junta vecinal (J.V.)" required error={touched ? errs.jv : ""}>
            <Input
              value={jv}
              onChange={(e) => setJv(e.target.value)}
              placeholder="Ej. J.V. N°12 Villa Frei"
              invalid={touched && !!errs.jv}
            />
          </Field>
          <Field label="Beneficiario" required error={touched ? errs.beneficiario : ""}>
            <Input
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.target.value)}
              placeholder="Nombre del beneficiario o comité"
              invalid={touched && !!errs.beneficiario}
            />
          </Field>
          <Field label="Contacto" optional>
            <Input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Teléfono o correo" />
          </Field>
          <Field label="Dirección" required error={touched ? errs.direccion : ""} full>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, depto/casa"
              invalid={touched && !!errs.direccion}
            />
          </Field>
        </div>

        <div
          className="form-section__title"
          style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>
            Insumos entregados <span className="req">*</span>
          </span>
        </div>
        {touched && errs.items && (
          <div className="field__error" style={{ marginBottom: 10 }}>
            <I.AlertCircle size={13} />
            {errs.items}
          </div>
        )}

        <div className="repeater">
          <div className="repeater__head">
            <div>Insumo</div>
            <div>Cantidad</div>
            <div style={{ textAlign: "center" }}>Unidad</div>
            <div></div>
          </div>
          {items.length === 0 && <div className="repeater__empty">No hay insumos agregados.</div>}
          {items.map((it, i) => {
            const ins = it.insumoId ? app.insumo(it.insumoId) : null
            const grupo = grupoDe(it.tipo)
            // Una variante ocupada en otra fila no se puede repetir: la entrega
            // tiene un único ítem por insumo (@@unique([deliveryId, supplyId])).
            const libre = (x: { id: string }) => !usedIds.includes(x.id) || x.id === it.insumoId
            return (
              <div className="repeater__row" key={i}>
                <Select
                  value={it.tipo}
                  onChange={(e) => {
                    const g = grupoDe(e.target.value)
                    // Con una sola unidad no hay nada que preguntar: se resuelve sola.
                    setItem(i, {
                      tipo: e.target.value,
                      insumoId: g?.variantes.length === 1 ? g.variantes[0].id : "",
                    })
                  }}
                >
                  <option value="">Selecciona un insumo…</option>
                  {grupos.map((g) => (
                    <option key={g.tipo} value={g.tipo} disabled={!g.variantes.some(libre)}>
                      {g.tipo}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={it.cantidad}
                  onChange={(e) => setItem(i, { cantidad: e.target.value })}
                  placeholder="0"
                />
                {grupo && grupo.variantes.length > 1 ? (
                  <Select
                    value={it.insumoId}
                    invalid={touched && !it.insumoId}
                    onChange={(e) => setItem(i, { insumoId: e.target.value })}
                  >
                    <option value="">Unidad…</option>
                    {grupo.variantes.map((x) => (
                      <option key={x.id} value={x.id} disabled={!libre(x)}>
                        {x.unidad}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="unit-tag">{ins ? ins.unidad : "—"}</div>
                )}
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeItem(i)}
                  title="Quitar"
                  disabled={items.length === 1}
                >
                  <I.Trash size={16} />
                </button>
              </div>
            )
          })}
          <div className="repeater__foot">
            <button
              className="btn btn--secondary btn--sm"
              onClick={addItem}
              disabled={items.length >= app.data.insumos.length}
            >
              <I.Plus size={15} /> Agregar insumo
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Puedes agregar varios insumos con sus cantidades.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Delete ---------------- */
export function DeleteEntrega({
  en,
  fromDetail,
  onDeleted,
  onClose,
}: {
  en: Entrega
  fromDetail?: boolean
  onDeleted?: () => void
  onClose: () => void
}) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const sol = en.solicitudId ? app.solicitud(en.solicitudId) : null
  const ev = sol?.eventoId ? app.evento(sol.eventoId) : null

  return (
    <ConfirmDialog
      title="Eliminar entrega"
      message={
        <>
          ¿Confirmas eliminar la entrega{" "}
          <span className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
            {en.folio}
          </span>{" "}
          a <b>{en.beneficiario}</b>? Esta acción no se puede deshacer.
        </>
      }
      warn={
        <>
          La eliminación <b>no afecta a la solicitud</b> {sol ? <span className="mono">{sol.folio}</span> : null}
          {ev ? (
            <>
              {" "}
              ni al evento <span className="mono">{ev.folio}</span>
            </>
          ) : null}{" "}
          ni a los insumos del catálogo.
        </>
      }
      confirmLabel="Eliminar entrega"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarEntrega(en.id), {
          kind: "danger",
          title: "Entrega eliminada",
          text: en.folio,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (onDeleted) onDeleted()
        else if (fromDetail)
          app.nav(sol ? { name: "solicitud", id: sol.id } : ev ? { name: "evento", id: ev.id } : { name: "entregas" })
      }}
      onClose={onClose}
    />
  )
}
