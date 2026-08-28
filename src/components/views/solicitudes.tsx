"use client"

/* ============================================================
   Solicitudes — portado de src/solicitudes.jsx
   ============================================================ */
import { useState, type ReactNode } from "react"
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
  Textarea,
  useClickOutside,
  usePersistedState,
} from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, fmtDateTime, initials, relTime } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { crearSolicitud, editarSolicitud, eliminarSolicitud } from "@/server/actions/emergencias"
import type { EstadoSolicitud, Solicitud } from "@/lib/types"
import { EntregaForm } from "./entregas"
import { EventoForm } from "./eventos"

function clamp2(text: string) {
  return (
    <span
      style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        maxWidth: 420,
      }}
    >
      {text}
    </span>
  )
}

export const ESTADOS = {
  atendida: { label: "Atendida", variant: "green" },
  pendiente: { label: "Pendiente", variant: "amber" },
  anulada: { label: "Anulada", variant: "red" },
} as const

export function EstadoBadge({ value, respuesta }: { value: EstadoSolicitud; respuesta?: string }) {
  const e = ESTADOS[value] ?? ESTADOS.pendiente
  const label = value === "atendida" && respuesta && respuesta.trim() ? "Atendida y Entregada" : e.label
  return (
    <Badge variant={e.variant} dot>
      {label}
    </Badge>
  )
}

const LS_VISTA = "dgrd_sol_vista"

/* ---------------- List ---------------- */
export function SolicitudesList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todas" | EstadoSolicitud>("todas")
  const [eventoFiltro, setEventoFiltro] = useState<"todas" | "con" | "sin">("todas")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [orden, setOrden] = useState<"desc" | "asc">("desc")
  const [advOpen, setAdvOpen] = useState(false)
  const advRef = useClickOutside<HTMLDivElement>(() => setAdvOpen(false))
  const [vista, setVista] = usePersistedState<"detallada" | "compacta">(LS_VISTA, "detallada")
  const compact = vista === "compacta"

  const [form, setForm] = useState<{ mode: "create" | "edit"; data: Solicitud | null } | null>(null)
  const [del, setDel] = useState<Solicitud | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const rows = app.data.solicitudes
    .filter((s) => (estadoFiltro === "todas" ? true : s.estado === estadoFiltro))
    .filter((s) => (eventoFiltro === "todas" ? true : eventoFiltro === "con" ? !!s.eventoId : !s.eventoId))
    .filter((s) => (desde ? s.creado.slice(0, 10) >= desde : true))
    .filter((s) => (hasta ? s.creado.slice(0, 10) <= hasta : true))
    .filter((s) => {
      const t = (s.folio + " " + s.medio + " " + s.descripcion + " " + s.respuesta).toLowerCase()
      return t.includes(q.toLowerCase())
    })
    .sort((a, b) => (orden === "asc" ? (a.creado < b.creado ? -1 : 1) : a.creado < b.creado ? 1 : -1))

  const counts = {
    todas: app.data.solicitudes.length,
    pendientes: app.data.solicitudes.filter((s) => s.estado === "pendiente").length,
  }

  const advCount =
    (eventoFiltro !== "todas" ? 1 : 0) +
    (estadoFiltro === "atendida" || estadoFiltro === "anulada" ? 1 : 0) +
    (desde || hasta ? 1 : 0) +
    (orden !== "desc" ? 1 : 0)
  const hayFiltros = estadoFiltro !== "todas" || eventoFiltro !== "todas" || !!desde || !!hasta || !!q
  const limpiarAvanzados = () => {
    setEstadoFiltro("todas")
    setEventoFiltro("todas")
    setDesde("")
    setHasta("")
    setOrden("desc")
  }

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Emergencias"
        title="Solicitudes"
        sub="Registro y seguimiento de solicitudes recibidas por distintos medios."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ mode: "create", data: null })}>
            <I.Plus size={16} /> Nueva solicitud
          </button>
        }
      />

      <div className="toolbar">
        <div className="seg">
          <button className={estadoFiltro === "todas" ? "on" : ""} onClick={() => setEstadoFiltro("todas")}>
            Todas <span className="count-pill">{counts.todas}</span>
          </button>
          <button className={estadoFiltro === "pendiente" ? "on" : ""} onClick={() => setEstadoFiltro("pendiente")}>
            Pendientes <span className="count-pill">{counts.pendientes}</span>
          </button>
        </div>
        <div className="toolbar__spacer" />
        <div className="seg" title="Cambiar vista de la tabla">
          <button className={!compact ? "on" : ""} onClick={() => setVista("detallada")}>
            <I.Table size={14} /> Detallada
          </button>
          <button className={compact ? "on" : ""} onClick={() => setVista("compacta")}>
            <I.Rows size={14} /> Compacta
          </button>
        </div>
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
                <div className="filter-menu__label">Estado</div>
                {(
                  [
                    ["todas", "Todas"],
                    ["atendida", "Atendida"],
                    ["pendiente", "Pendiente"],
                    ["anulada", "Anulada"],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} className="menu-item filter-opt" onClick={() => setEstadoFiltro(v)}>
                    <span>{l}</span>
                    {estadoFiltro === v && <I.Check size={15} className="filter-opt__check" />}
                  </button>
                ))}
              </div>
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
                <div className="filter-menu__label">Rango de fechas</div>
                <div className="filter-dates">
                  <label className="filter-date">
                    <span>Desde</span>
                    <input
                      type="date"
                      value={desde}
                      max={hasta || undefined}
                      onChange={(e) => setDesde(e.target.value)}
                    />
                  </label>
                  <label className="filter-date">
                    <span>Hasta</span>
                    <input
                      type="date"
                      value={hasta}
                      min={desde || undefined}
                      onChange={(e) => setHasta(e.target.value)}
                    />
                  </label>
                </div>
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
                <button className="link" disabled={!advCount} onClick={limpiarAvanzados}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por folio, medio o respuesta…" />
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.FileText />}
            title="No hay solicitudes"
            text={
              hayFiltros
                ? "No se encontraron solicitudes con los filtros aplicados."
                : "Aún no se han registrado solicitudes de emergencia."
            }
            action={
              <button className="btn btn--primary" onClick={() => setForm({ mode: "create", data: null })}>
                <I.Plus size={16} /> Nueva solicitud
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 132 }}>Folio</th>
                  {!compact && <th>Medio / fuente</th>}
                  <th>Lo solicitado</th>
                  {!compact && <th>Respuesta</th>}
                  <th style={{ width: 124 }}>Estado</th>
                  {!compact && <th style={{ width: 150 }}>Evento</th>}
                  {!compact && <th style={{ width: 132 }}>Creada</th>}
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const ev = s.eventoId ? app.evento(s.eventoId) : null
                  return (
                    <tr key={s.id} className="clickable" onClick={() => setDrawerId(s.id)}>
                      <td>
                        <span className="mono cell-strong">{s.folio}</span>
                      </td>
                      {!compact && <td className="cell-strong">{s.medio}</td>}
                      <td className={compact ? "cell-strong" : "cell-muted"}>
                        {s.descripcion ? clamp2(s.descripcion) : <span className="cell-muted">—</span>}
                      </td>
                      {!compact && <td className="cell-muted">{clamp2(s.respuesta)}</td>}
                      <td>
                        <EstadoBadge value={s.estado} respuesta={s.respuesta} />
                      </td>
                      {!compact && (
                        <td>
                          {ev ? (
                            <Badge variant="yellow" dot>
                              {ev.folio}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Sin evento</Badge>
                          )}
                        </td>
                      )}
                      {!compact && (
                        <td>
                          <span className="mono cell-muted">{fmtDate(s.creado)}</span>
                        </td>
                      )}
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn" title="Ver" onClick={() => setDrawerId(s.id)}>
                            <I.Eye />
                          </button>
                          <button
                            className="icon-btn"
                            title="Editar"
                            onClick={() => setForm({ mode: "edit", data: s })}
                          >
                            <I.Pencil />
                          </button>
                          <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(s)}>
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

      {form && <SolicitudForm mode={form.mode} data={form.data} onClose={() => setForm(null)} />}
      {del && <DeleteSolicitud s={del} onClose={() => setDel(null)} />}
      <DrawerShell
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        eyebrow={drawerId ? (app.solicitud(drawerId)?.folio ?? "") : ""}
        title="Solicitud"
      >
        {drawerId && <SolicitudDetail id={drawerId} embedded onClose={() => setDrawerId(null)} />}
      </DrawerShell>
    </div>
  )
}

/* ---------------- Detail ---------------- */
export function SolicitudDetail({ id, embedded, onClose }: { id: string; embedded?: boolean; onClose?: () => void }) {
  const app = useApp()
  const s = app.data.solicitudes.find((x) => x.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)
  const [crearEvento, setCrearEvento] = useState(false)
  const [crearEntrega, setCrearEntrega] = useState(false)

  if (!s)
    return (
      <EmptyState
        title="Solicitud no encontrada"
        action={
          <button
            className="btn btn--secondary"
            onClick={() => (embedded ? onClose?.() : app.nav({ name: "solicitudes" }))}
          >
            Volver
          </button>
        }
      />
    )

  const ev = s.eventoId ? app.evento(s.eventoId) : null
  const entrega = app.entregaDeSolicitud(s.id)
  const autor = app.user(s.creadoPor)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={embedded ? null : <span className="mono">{s.folio}</span>}
        title="Detalle de solicitud"
        back={embedded ? undefined : { label: "Solicitudes", onClick: () => app.nav({ name: "solicitudes" }) }}
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
        <div className="panel">
          <div className="panel__head">
            <h2>
              <I.FileText size={17} /> Información de la solicitud
            </h2>
          </div>
          <div className="panel__body">
            <div className="kv">
              <KV k="Medio / fuente">{s.medio}</KV>
              <KV k="Estado">
                <EstadoBadge value={s.estado} respuesta={s.respuesta} />
              </KV>
              <KV k="Fecha de creación">
                <span className="mono">{fmtDateTime(s.creado)}</span>
              </KV>
              <KV k="Lo solicitado" full empty={!s.descripcion}>
                {s.descripcion}
              </KV>
              <KV k="Respuesta" full empty={!s.respuesta}>
                {s.respuesta}
              </KV>
            </div>
          </div>
        </div>

        <div>
          <div className="aside-card">
            <div className="aside-card__title">Evento asociado</div>
            {ev ? (
              <div>
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
                {app.canEdit && (
                  <button
                    className="link"
                    style={{
                      marginTop: 12,
                      fontSize: 12.5,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--muted)",
                    }}
                    onClick={() => setForm(true)}
                  >
                    <I.Unlink size={14} /> Desasociar evento
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div
                  className="info-box"
                  style={{
                    marginBottom: 14,
                    background: "var(--slate-50)",
                    borderColor: "var(--line)",
                    color: "var(--muted)",
                  }}
                >
                  <I.Info size={16} />
                  <div>Esta solicitud no tiene un evento asociado.</div>
                </div>
                {app.canEdit && (
                  <button className="btn btn--primary btn--block" onClick={() => setCrearEvento(true)}>
                    <I.Plus size={16} /> Crear evento desde solicitud
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="aside-card">
            <div className="aside-card__title">Entrega asociada</div>
            {entrega ? (
              <button
                className="subrow"
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r)",
                  textAlign: "left",
                  background: "var(--surface)",
                }}
                onClick={() => app.nav({ name: "entrega", id: entrega.id })}
              >
                <span className="subrow__lead" style={{ background: "var(--green-50)", color: "var(--green)" }}>
                  <I.Truck size={17} />
                </span>
                <span className="subrow__main">
                  <span className="subrow__title mono">{entrega.folio}</span>
                  <span className="subrow__meta">
                    {entrega.beneficiario} · {entrega.items.length} {entrega.items.length === 1 ? "insumo" : "insumos"}
                  </span>
                </span>
                <I.ChevronRight size={16} className="subrow__chev" />
              </button>
            ) : (
              <div>
                <div
                  className="info-box"
                  style={{
                    marginBottom: 14,
                    background: "var(--slate-50)",
                    borderColor: "var(--line)",
                    color: "var(--muted)",
                  }}
                >
                  <I.Info size={16} />
                  <div>Esta solicitud aún no tiene una entrega registrada.</div>
                </div>
                {app.canEdit && (
                  <button className="btn btn--primary btn--block" onClick={() => setCrearEntrega(true)}>
                    <I.Plus size={16} /> Registrar entrega
                  </button>
                )}
              </div>
            )}
          </div>

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
                    Registró la solicitud
                  </div>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
                <I.Clock size={14} /> {fmtDateTime(s.creado)} · {relTime(s.creado)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {form && <SolicitudForm mode="edit" data={s} onClose={() => setForm(false)} />}
      {del && (
        <DeleteSolicitud
          s={s}
          fromDetail={!embedded}
          onDeleted={embedded ? onClose : undefined}
          onClose={() => setDel(false)}
        />
      )}
      {crearEvento && <EventoForm mode="create" fromSolicitud={s} onClose={() => setCrearEvento(false)} />}
      {crearEntrega && <EntregaForm mode="create" solicitudId={s.id} onClose={() => setCrearEntrega(false)} />}
    </div>
  )
}

/* ---------------- Form (modal) ---------------- */
export function SolicitudForm({
  mode,
  data,
  onClose,
}: {
  mode: "create" | "edit"
  data: Solicitud | null
  onClose: () => void
}) {
  const app = useApp()
  const [medio, setMedio] = useState(data?.medio ?? "")
  const [descripcion, setDescripcion] = useState(data?.descripcion ?? "")
  const [respuesta, setRespuesta] = useState(data?.respuesta ?? "")
  const [eventoId, setEventoId] = useState(data?.eventoId ?? "")
  const [estado, setEstado] = useState<EstadoSolicitud>(data?.estado ?? "pendiente")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const errMedio = touched && !medio.trim() ? "Indica el medio o fuente." : ""

  const save = async () => {
    setTouched(true)
    if (!medio.trim()) return
    const payload = {
      medio: medio.trim(),
      descripcion: descripcion.trim(),
      respuesta: respuesta.trim(),
      estado,
      eventoId: eventoId || null,
    }
    setSaving(true)
    const res =
      mode === "create"
        ? await app.run(() => crearSolicitud(payload), { title: "Solicitud registrada", text: "Se creó la solicitud." })
        : await app.run(() => editarSolicitud(data!.id, payload), {
            title: "Cambios guardados",
            text: "Solicitud actualizada.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title={mode === "create" ? "Nueva solicitud" : "Editar solicitud"}
      sub={
        mode === "edit" ? (
          <span className="mono">{data!.folio}</span>
        ) : (
          "La fecha y hora de creación se registran automáticamente."
        )
      }
      icon={
        <div className="confirm-icon" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
          <I.FileText size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Registrar solicitud" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <Field
          label="Medio / fuente"
          required
          error={errMedio}
          hint="¿Por dónde llegó la solicitud? (teléfono, correo, presencial, etc.)"
        >
          <Input
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            placeholder="Ej. Llamado telefónico — vecina del sector"
            invalid={!!errMedio}
          />
        </Field>
        <Field label="Lo solicitado" optional hint="Descripción de lo que reporta o pide la persona solicitante.">
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe lo que solicita o reporta la persona…"
          />
        </Field>
        <Field
          label="Estado"
          hint="Atendida: se actuó en terreno. Pendiente: aún sin atender. Anulada: se cancela (p. ej. duplicada por otro medio)."
        >
          <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoSolicitud)}>
            <option value="pendiente">Pendiente</option>
            <option value="atendida">Atendida</option>
            <option value="anulada">Anulada</option>
          </Select>
        </Field>
        <Field
          label="Evento asociado"
          optional
          hint="Puede dejarse vacío. El evento puede asociarse después, al decidir atender la solicitud."
        >
          <Select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Sin evento asociado</option>
            {app.data.eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.folio} — {app.tipoNombre(ev.tipoId)}, {ev.sector}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Respuesta" optional hint="Acción, derivación o respuesta entregada a la solicitud.">
          <Textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Describe la respuesta o gestión realizada…"
          />
        </Field>
      </div>
    </Modal>
  )
}

/* ---------------- Delete (cascada: borra la entrega dependiente) ---------------- */
export function DeleteSolicitud({
  s,
  fromDetail,
  onDeleted,
  onClose,
}: {
  s: Solicitud
  fromDetail?: boolean
  onDeleted?: () => void
  onClose: () => void
}) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const ev = s.eventoId ? app.evento(s.eventoId) : null
  const ents = app.entregasDeSolicitud(s.id)
  const tieneEnt = ents.length > 0

  let warn: ReactNode = null
  if (tieneEnt) {
    warn = (
      <>
        Esta solicitud tiene{" "}
        {ents.length === 1 ? (
          <>
            la entrega <b className="mono">{ents[0].folio}</b> asociada, que también será eliminada
          </>
        ) : (
          <>
            <b>{ents.length} entregas</b> asociadas, que también serán eliminadas
          </>
        )}
        , ya que una entrega no puede existir sin su solicitud.
        {ev ? (
          <>
            {" "}
            El evento <b>{ev.folio}</b> no se verá afectado.
          </>
        ) : null}
      </>
    )
  } else if (ev) {
    warn = (
      <>
        Esta solicitud está asociada al evento <b>{ev.folio}</b>. La eliminación <b>no afectará al evento</b>, solo se
        quitará esta solicitud.
      </>
    )
  }

  return (
    <ConfirmDialog
      title="Eliminar solicitud"
      message={
        <>
          ¿Confirmas eliminar la solicitud{" "}
          <span className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
            {s.folio}
          </span>
          ? Esta acción no se puede deshacer.
        </>
      }
      warn={warn}
      confirmLabel={tieneEnt ? "Eliminar solicitud y entrega" : "Eliminar solicitud"}
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarSolicitud(s.id), {
          kind: "danger",
          title: "Solicitud eliminada",
          text: tieneEnt ? `${s.folio} y su entrega` : s.folio,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (onDeleted) onDeleted()
        else if (fromDetail) app.nav({ name: "solicitudes" })
      }}
      onClose={onClose}
    />
  )
}
