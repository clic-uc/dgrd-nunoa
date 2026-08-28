"use client"

/* ============================================================
   Eventos — portado de src/eventos.jsx
   ============================================================ */
import { useState } from "react"
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  KV,
  Modal,
  PageHead,
  SearchBox,
  Select,
  Textarea,
  type BadgeVariant,
} from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, fmtDateLong, fmtDateTime, initials } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { crearEvento, editarEvento, eliminarEvento } from "@/server/actions/emergencias"
import type { Evento, Solicitud } from "@/lib/types"
import { EntregaForm } from "./entregas"

/**
 * Color por tipo de evento. El mockup mapeaba ids fijos (te-1…te-7); acá los
 * ids los genera la base, así que se deriva del nombre y cae en "neutral"
 * para los tipos que se agreguen desde Configuración.
 */
export function tipoVariant(nombre: string): BadgeVariant {
  const n = nombre.toLowerCase()
  if (n.includes("anegamiento") || n.includes("inundac")) return "blue"
  if (n.includes("incendio") || n.includes("sismo")) return "red"
  if (n.includes("vendaval") || n.includes("viento")) return "amber"
  if (n.includes("social")) return "yellow"
  return "neutral"
}

/* ---------------- List ---------------- */
export function EventosList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [tipo, setTipo] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [form, setForm] = useState(false)
  const [del, setDel] = useState<Evento | null>(null)

  const rows = app.data.eventos
    .filter((e) => (tipo ? e.tipoId === tipo : true))
    .filter((e) => (desde ? e.fecha >= desde : true))
    .filter((e) => (hasta ? e.fecha <= hasta : true))
    .filter((e) => {
      const t = (e.folio + " " + app.tipoNombre(e.tipoId) + " " + e.sector).toLowerCase()
      return t.includes(q.toLowerCase())
    })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const hasFilter = tipo || desde || hasta || q

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Emergencias"
        title="Eventos"
        sub="Eventos de emergencia documentados, con sus entregas y solicitudes asociadas."
        actions={
          <button className="btn btn--primary" onClick={() => setForm(true)}>
            <I.Plus size={16} /> Nuevo evento
          </button>
        }
      />

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por folio, tipo o sector…" />
        <div className="filter-select">
          <I.Filter size={15} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {app.data.tiposEvento.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <I.ChevronDown size={14} />
        </div>
        <div className="filter-select" title="Rango de fechas">
          <span className="filter-label">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="filter-select">
          <span className="filter-label">Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {hasFilter && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setQ("")
              setTipo("")
              setDesde("")
              setHasta("")
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.Siren />}
            title="No hay eventos"
            text={
              hasFilter
                ? "No se encontraron eventos con los filtros aplicados."
                : "Aún no se han registrado eventos de emergencia."
            }
            action={
              <button className="btn btn--primary" onClick={() => setForm(true)}>
                <I.Plus size={16} /> Nuevo evento
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 128 }}>Folio</th>
                  <th style={{ width: 120 }}>Fecha</th>
                  <th style={{ width: 170 }}>Tipo</th>
                  <th>Sector</th>
                  <th className="num" style={{ width: 96 }}>
                    Afectados
                  </th>
                  <th className="num" style={{ width: 96 }}>
                    Entregas
                  </th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const nEnt = app.entregasDeEvento(e.id).length
                  const nombre = app.tipoNombre(e.tipoId)
                  return (
                    <tr key={e.id} className="clickable" onClick={() => app.nav({ name: "evento", id: e.id })}>
                      <td>
                        <span className="mono cell-strong">{e.folio}</span>
                      </td>
                      <td>
                        <span className="mono cell-muted">{fmtDate(e.fecha)}</span>
                      </td>
                      <td>
                        <Badge variant={tipoVariant(nombre)} dot>
                          {nombre}
                        </Badge>
                      </td>
                      <td className="cell-strong">{e.sector}</td>
                      <td className="num mono">{e.afectados}</td>
                      <td className="num">
                        {nEnt > 0 ? <span className="count-pill">{nEnt}</span> : <span className="cell-muted">—</span>}
                      </td>
                      <td className="col-actions" onClick={(ev) => ev.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Ver"
                            onClick={() => app.nav({ name: "evento", id: e.id })}
                          >
                            <I.Eye />
                          </button>
                          <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(e)}>
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

      {form && <EventoForm mode="create" onClose={() => setForm(false)} />}
      {del && <DeleteEvento e={del} onClose={() => setDel(null)} />}
    </div>
  )
}

/* ---------------- Detail ---------------- */
export function EventoDetail({ id }: { id: string }) {
  const app = useApp()
  const e = app.data.eventos.find((x) => x.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)
  const [entregaForm, setEntregaForm] = useState(false)

  if (!e)
    return (
      <EmptyState
        title="Evento no encontrado"
        action={
          <button className="btn btn--secondary" onClick={() => app.nav({ name: "eventos" })}>
            Volver
          </button>
        }
      />
    )

  const entregas = app.entregasDeEvento(e.id)
  const solicitudes = app.solicitudesDeEvento(e.id)
  const autor = app.user(e.creadoPor)
  const totalInsumos = entregas.reduce((acc, en) => acc + en.items.reduce((a, i) => a + i.cantidad, 0), 0)
  const nombre = app.tipoNombre(e.tipoId)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="mono">{e.folio}</span>
            <Badge variant={tipoVariant(nombre)} dot>
              {nombre}
            </Badge>
          </span>
        }
        title={e.sector}
        sub={
          <span style={{ display: "inline-flex", gap: 14, alignItems: "center" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <I.Calendar size={14} /> {fmtDateLong(e.fecha)}
            </span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <I.Users3 size={14} /> {e.afectados} afectados
            </span>
          </span>
        }
        back={{ label: "Eventos", onClick: () => app.nav({ name: "eventos" }) }}
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

      <div className="stat-row" style={{ marginBottom: 18, background: "var(--surface)" }}>
        <div className="stat">
          <div className="stat__v">{e.afectados}</div>
          <div className="stat__k">Personas afectadas</div>
        </div>
        <div className="stat">
          <div className="stat__v">{entregas.length}</div>
          <div className="stat__k">Entregas registradas</div>
        </div>
        <div className="stat">
          <div className="stat__v">{totalInsumos}</div>
          <div className="stat__k">Unidades de insumo entregadas</div>
        </div>
        <div className="stat">
          <div className="stat__v">{solicitudes.length}</div>
          <div className="stat__k">Solicitudes asociadas</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Siren size={17} /> Información del evento
              </h2>
            </div>
            <div className="panel__body">
              <div className="kv">
                <KV k="Tipo de evento">
                  <Badge variant={tipoVariant(nombre)} dot>
                    {nombre}
                  </Badge>
                </KV>
                <KV k="Fecha">
                  <span className="mono">{fmtDate(e.fecha)}</span>
                </KV>
                <KV k="Sector">{e.sector}</KV>
                <KV k="Personas afectadas">
                  <span className="mono">{e.afectados}</span>
                </KV>
                <KV k="Instituciones involucradas" full empty={!e.instituciones}>
                  {e.instituciones}
                </KV>
                <KV k="Acciones tomadas" full empty={!e.acciones}>
                  {e.acciones}
                </KV>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Truck size={17} /> Entregas asociadas <span className="count-pill">{entregas.length}</span>
              </h2>
              <div className="panel__actions">
                {app.canEdit && (
                  <button className="btn btn--secondary btn--sm" onClick={() => setEntregaForm(true)}>
                    <I.Plus size={15} /> Registrar entrega
                  </button>
                )}
              </div>
            </div>
            <div className="panel__body--flush">
              {entregas.length === 0 ? (
                <EmptyState
                  icon={<I.Truck />}
                  title="Sin entregas registradas"
                  text="Registra las entregas de insumos realizadas durante este evento."
                  action={
                    app.canEdit && (
                      <button className="btn btn--secondary btn--sm" onClick={() => setEntregaForm(true)}>
                        <I.Plus size={15} /> Registrar entrega
                      </button>
                    )
                  }
                />
              ) : (
                entregas.map((en) => (
                  <div key={en.id} className="subrow" onClick={() => app.nav({ name: "entrega", id: en.id })}>
                    <span className="subrow__lead">
                      <I.Truck size={17} />
                    </span>
                    <span className="subrow__main">
                      <span className="subrow__title">{en.beneficiario}</span>
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
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.FileText size={17} /> Solicitudes asociadas <span className="count-pill">{solicitudes.length}</span>
              </h2>
            </div>
            <div className="panel__body--flush">
              {solicitudes.length === 0 ? (
                <EmptyState
                  icon={<I.FileText />}
                  title="Sin solicitudes asociadas"
                  text="No hay solicitudes vinculadas a este evento."
                />
              ) : (
                solicitudes.map((s) => (
                  <div key={s.id} className="subrow" onClick={() => app.nav({ name: "solicitud", id: s.id })}>
                    <span className="subrow__lead">
                      <I.FileText size={16} />
                    </span>
                    <span className="subrow__main">
                      <span className="subrow__title">{s.medio}</span>
                      <span className="subrow__meta">
                        <span className="mono">{s.folio}</span>
                        <span className="dot-sep">·</span>
                        {fmtDate(s.creado)}
                      </span>
                    </span>
                    <I.ChevronRight size={16} className="subrow__chev" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="aside-card">
            <div className="aside-card__title">Registro</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                  {initials(autor?.nombre, autor?.apellido)}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {autor?.nombre} {autor?.apellido}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    Registró el evento
                  </div>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
                <I.Clock size={14} /> {fmtDateTime(e.creado)}
              </div>
            </div>
          </div>
          {app.canEdit && (
            <div className="aside-card">
              <div className="aside-card__title">Acciones rápidas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="btn btn--secondary btn--block" onClick={() => setEntregaForm(true)}>
                  <I.Plus size={15} /> Registrar entrega
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setForm(true)}>
                  <I.Pencil size={15} /> Editar evento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {form && <EventoForm mode="edit" data={e} onClose={() => setForm(false)} />}
      {del && <DeleteEvento e={e} fromDetail onClose={() => setDel(false)} />}
      {entregaForm && <EntregaForm mode="create" eventoId={e.id} onClose={() => setEntregaForm(false)} />}
    </div>
  )
}

/* ---------------- Form ---------------- */
export function EventoForm({
  mode,
  data,
  fromSolicitud,
  onClose,
}: {
  mode: "create" | "edit"
  data?: Evento
  fromSolicitud?: Solicitud
  onClose: () => void
}) {
  const app = useApp()
  const [tipoId, setTipoId] = useState(data?.tipoId ?? "")
  const [fecha, setFecha] = useState(data?.fecha ?? "")
  const [sector, setSector] = useState(data?.sector ?? "")
  const [afectados, setAfectados] = useState<string>(data?.afectados != null ? String(data.afectados) : "")
  const [instituciones, setInstituciones] = useState(data?.instituciones ?? "")
  const [acciones, setAcciones] = useState(data?.acciones ?? (fromSolicitud ? fromSolicitud.respuesta : ""))
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const errs = {
    tipoId: !tipoId ? "Selecciona el tipo." : "",
    fecha: !fecha ? "Indica la fecha." : "",
    sector: !sector.trim() ? "Indica el sector." : "",
    afectados: afectados === "" || isNaN(Number(afectados)) ? "Indica el n° de afectados." : "",
  }
  const valid = !errs.tipoId && !errs.fecha && !errs.sector && !errs.afectados

  const save = async () => {
    setTouched(true)
    if (!valid) return
    const payload = {
      tipoId,
      fecha,
      sector: sector.trim(),
      afectados: Number(afectados),
      instituciones: instituciones.trim(),
      acciones: acciones.trim(),
    }
    setSaving(true)
    if (mode === "create") {
      const created = await app.run(() => crearEvento(payload, fromSolicitud?.id ?? null), {
        title: fromSolicitud ? "Evento creado" : "Evento registrado",
        text: fromSolicitud
          ? `La solicitud ${fromSolicitud.folio} quedó asociada.`
          : "Se creó el evento de emergencia.",
      })
      setSaving(false)
      if (created === null) return
      onClose()
      if (fromSolicitud) app.nav({ name: "evento", id: created.id })
    } else {
      const res = await app.run(() => editarEvento(data!.id, payload), {
        title: "Cambios guardados",
        text: "Evento actualizado.",
      })
      setSaving(false)
      if (res !== null) onClose()
    }
  }

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title={
        mode === "create"
          ? fromSolicitud
            ? "Crear evento desde solicitud"
            : "Nuevo evento de emergencia"
          : "Editar evento"
      }
      sub={mode === "edit" ? <span className="mono">{data!.folio}</span> : null}
      icon={
        <div className="confirm-icon" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
          <I.Siren size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving
              ? "Guardando…"
              : mode === "create"
                ? fromSolicitud
                  ? "Crear y asociar"
                  : "Registrar evento"
                : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        {fromSolicitud && (
          <div className="info-box" style={{ marginBottom: 18 }}>
            <I.Link size={16} />
            <div>
              Al crear el evento, la solicitud <b className="mono">{fromSolicitud.folio}</b> quedará asociada
              automáticamente. Las acciones se precargaron desde su respuesta.
            </div>
          </div>
        )}
        <div className="form-grid">
          <Field label="Tipo de evento" required error={touched ? errs.tipoId : ""}>
            <Select value={tipoId} onChange={(e) => setTipoId(e.target.value)} invalid={touched && !!errs.tipoId}>
              <option value="">Selecciona un tipo…</option>
              {app.data.tiposEvento.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" required error={touched ? errs.fecha : ""}>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              invalid={touched && !!errs.fecha}
            />
          </Field>
          <Field label="Sector" required error={touched ? errs.sector : ""}>
            <Input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Ej. Villa Frei"
              invalid={touched && !!errs.sector}
            />
          </Field>
          <Field label="Personas afectadas" required error={touched ? errs.afectados : ""}>
            <Input
              type="number"
              min="0"
              value={afectados}
              onChange={(e) => setAfectados(e.target.value)}
              placeholder="0"
              invalid={touched && !!errs.afectados}
            />
          </Field>
          <Field label="Instituciones involucradas" optional full>
            <Input
              value={instituciones}
              onChange={(e) => setInstituciones(e.target.value)}
              placeholder="Ej. Bomberos, SAMU, Carabineros…"
            />
          </Field>
          <Field label="Acciones tomadas" optional full>
            <Textarea
              value={acciones}
              onChange={(e) => setAcciones(e.target.value)}
              placeholder="Describe las acciones realizadas durante el evento…"
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Delete (desvincula dependientes, no los borra) ---------------- */
export function DeleteEvento({ e, fromDetail, onClose }: { e: Evento; fromDetail?: boolean; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const entregas = app.entregasDeEvento(e.id)
  const solicitudes = app.solicitudesDeEvento(e.id)
  const deps: string[] = []
  if (solicitudes.length) deps.push(`${solicitudes.length} ${solicitudes.length === 1 ? "solicitud" : "solicitudes"}`)
  if (entregas.length) deps.push(`${entregas.length} ${entregas.length === 1 ? "entrega" : "entregas"}`)

  return (
    <ConfirmDialog
      title="Eliminar evento"
      message={
        <>
          ¿Confirmas eliminar el evento{" "}
          <span className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
            {e.folio}
          </span>
          ? Esta acción no se puede deshacer.
        </>
      }
      warn={
        deps.length ? (
          <>
            Sus <b>{deps.join(" y ")}</b> asociadas <b>no se eliminarán</b>: quedarán registradas de forma
            independiente, sin evento asociado. Podrás reasignarlas a otro evento cuando quieras.
          </>
        ) : null
      }
      confirmLabel="Eliminar evento"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarEvento(e.id), {
          kind: "danger",
          title: "Evento eliminado",
          text: deps.length ? `${e.folio} · ${deps.join(" y ")} quedaron sin evento` : e.folio,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (fromDetail) app.nav({ name: "eventos" })
      }}
      onClose={onClose}
    />
  )
}
