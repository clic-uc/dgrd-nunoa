"use client"

/* ============================================================
   Plan RRD — Acciones estratégicas & Actividades
   Portado de src/acciones.jsx
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
  Textarea,
} from "@/components/kit"
import { I } from "@/components/icons"
import { fileMeta, fmtBytes, fmtDate, fmtDateLong, fmtDateTime, initials, parseISO } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { SectionTabs } from "@/components/app/section-tabs"
import {
  adjuntarEvidencia,
  crearAccion,
  crearActividad,
  editarAccion,
  editarActividad,
  eliminarAccion,
  eliminarActividad,
  eliminarEvidencia,
} from "@/server/actions/plan"
import type { Accion, Actividad, Evidencia } from "@/lib/types"
import { EvidenceDropzone, EvidenceLightbox, StagedFile, type ArchivoStaged } from "./evidencia"

/* ===================================================================
   ACCIONES ESTRATÉGICAS
   =================================================================== */

export function AccionesList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [anio, setAnio] = useState("")
  const [form, setForm] = useState(false)
  const [del, setDel] = useState<Accion | null>(null)

  const anios = [...new Set(app.data.acciones.map((a) => a.anio))].sort((a, b) => b - a)

  const rows = app.data.acciones
    .filter((a) => (anio ? String(a.anio) === anio : true))
    .filter((a) => (a.titulo + " " + a.temas).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.anio - a.anio || a.numero - b.numero)

  const hasFilter = anio || q

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={<SectionTabs group="plan" active="acciones" />}
        title="Acciones estratégicas"
        sub="Objetivos del Plan de Reducción del Riesgo de Desastres y las actividades que derivan de ellos."
        actions={
          <button className="btn btn--primary" onClick={() => setForm(true)}>
            <I.Plus size={16} /> Nueva acción
          </button>
        }
      />

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por título o tema…" />
        <div className="filter-select">
          <I.Filter size={15} />
          <select value={anio} onChange={(e) => setAnio(e.target.value)}>
            <option value="">Todos los años</option>
            {anios.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <I.ChevronDown size={14} />
        </div>
        {hasFilter && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setQ("")
              setAnio("")
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.Target />}
            title="No hay acciones estratégicas"
            text={
              hasFilter
                ? "No se encontraron acciones con los filtros aplicados."
                : "Aún no se han registrado acciones estratégicas del Plan RRD."
            }
            action={
              <button className="btn btn--primary" onClick={() => setForm(true)}>
                <I.Plus size={16} /> Nueva acción
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>N°</th>
                  <th>Título</th>
                  <th style={{ width: 80 }}>Año</th>
                  <th style={{ width: 116 }}>Inicio</th>
                  <th style={{ width: 116 }}>Término</th>
                  <th className="num" style={{ width: 110 }}>
                    Actividades
                  </th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const n = app.actividadesDeAccion(a.id).length
                  return (
                    <tr key={a.id} className="clickable" onClick={() => app.nav({ name: "accion", id: a.id })}>
                      <td>
                        <span className="mono cell-strong">{a.numero}</span>
                      </td>
                      <td className="cell-strong" style={{ maxWidth: 0 }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.titulo}
                        </div>
                      </td>
                      <td>
                        <span className="mono">{a.anio}</span>
                      </td>
                      <td>
                        <span className="mono cell-muted">{fmtDate(a.fechaInicio)}</span>
                      </td>
                      <td>
                        <span className="mono cell-muted">{fmtDate(a.fechaTermino)}</span>
                      </td>
                      <td className="num">
                        {n > 0 ? <span className="count-pill">{n}</span> : <span className="cell-muted">—</span>}
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Ver"
                            onClick={() => app.nav({ name: "accion", id: a.id })}
                          >
                            <I.Eye />
                          </button>
                          <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(a)}>
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

      {form && <AccionForm mode="create" onClose={() => setForm(false)} />}
      {del && <DeleteAccion a={del} onClose={() => setDel(null)} />}
    </div>
  )
}

/* ---------------- Detail ---------------- */
export function AccionDetail({ id }: { id: string }) {
  const app = useApp()
  const a = app.data.acciones.find((x) => x.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)
  const [actForm, setActForm] = useState(false)

  if (!a)
    return (
      <EmptyState
        title="Acción no encontrada"
        action={
          <button className="btn btn--secondary" onClick={() => app.nav({ name: "acciones" })}>
            Volver
          </button>
        }
      />
    )

  const acts = app.actividadesDeAccion(a.id).sort((x, y) => (x.fecha < y.fecha ? 1 : -1))
  const inicio = parseISO(a.fechaInicio)
  const termino = parseISO(a.fechaTermino)
  const dias = inicio && termino ? Math.round((termino.getTime() - inicio.getTime()) / 86400000) : 0

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="mono">Acción N°{a.numero}</span>
            <Badge variant="neutral">{a.anio}</Badge>
          </span>
        }
        title={a.titulo}
        sub={
          <span style={{ display: "inline-flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <I.Calendar size={14} /> {fmtDate(a.fechaInicio)} – {fmtDate(a.fechaTermino)}
            </span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <I.Clock size={14} /> {dias} días
            </span>
          </span>
        }
        back={{ label: "Acciones estratégicas", onClick: () => app.nav({ name: "acciones" }) }}
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

      <div className="detail-grid" style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)" }}>
        <div>
          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Activity size={17} /> Actividades <span className="count-pill">{acts.length}</span>
              </h2>
              <div className="panel__actions">
                {app.canEdit && (
                  <button className="btn btn--secondary btn--sm" onClick={() => setActForm(true)}>
                    <I.Plus size={15} /> Nueva actividad
                  </button>
                )}
              </div>
            </div>
            <div className="panel__body--flush">
              {acts.length === 0 ? (
                <EmptyState
                  icon={<I.Activity />}
                  title="Sin actividades registradas"
                  text="Registra las actividades que se desarrollan en el marco de esta acción estratégica."
                  action={
                    app.canEdit && (
                      <button className="btn btn--secondary btn--sm" onClick={() => setActForm(true)}>
                        <I.Plus size={15} /> Nueva actividad
                      </button>
                    )
                  }
                />
              ) : (
                acts.map((act) => {
                  const nEv = act.evidencia.length
                  return (
                    <div key={act.id} className="subrow" onClick={() => app.nav({ name: "actividad", id: act.id })}>
                      <span className="subrow__lead">
                        <I.Activity size={17} />
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
                          <span className="mono">{fmtDate(act.fecha)}</span>
                          <span className="dot-sep">·</span>
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
                })
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel__head">
              <h2>
                <I.Target size={17} /> Información de la acción
              </h2>
            </div>
            <div className="panel__body">
              <div className="kv">
                <KV k="N° de acción">
                  <span className="mono">{a.numero}</span>
                </KV>
                <KV k="Año">
                  <span className="mono">{a.anio}</span>
                </KV>
                <KV k="Fecha de inicio">
                  <span className="mono">{fmtDate(a.fechaInicio)}</span>
                </KV>
                <KV k="Fecha de término">
                  <span className="mono">{fmtDate(a.fechaTermino)}</span>
                </KV>
                <KV k="Cómo desarrollarla" full empty={!a.comoDesarrollar}>
                  {a.comoDesarrollar}
                </KV>
                <KV k="Temas" full empty={!a.temas}>
                  {a.temas}
                </KV>
              </div>
            </div>
          </div>
        </div>
      </div>

      {form && <AccionForm mode="edit" data={a} onClose={() => setForm(false)} />}
      {del && <DeleteAccion a={a} fromDetail onClose={() => setDel(false)} />}
      {actForm && <ActividadForm mode="create" accionId={a.id} onClose={() => setActForm(false)} />}
    </div>
  )
}

/* ---------------- Form ---------------- */
export function AccionForm({ mode, data, onClose }: { mode: "create" | "edit"; data?: Accion; onClose: () => void }) {
  const app = useApp()
  const [numero, setNumero] = useState<string>(data?.numero != null ? String(data.numero) : "")
  const [titulo, setTitulo] = useState(data?.titulo ?? "")
  const [anio, setAnio] = useState<string>(String(data?.anio ?? new Date().getFullYear()))
  const [fechaInicio, setFechaInicio] = useState(data?.fechaInicio ?? "")
  const [fechaTermino, setFechaTermino] = useState(data?.fechaTermino ?? "")
  const [comoDesarrollar, setComoDesarrollar] = useState(data?.comoDesarrollar ?? "")
  const [temas, setTemas] = useState(data?.temas ?? "")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const dupNumero = app.data.acciones.some(
    (a) => a.id !== data?.id && String(a.numero) === String(numero).trim() && String(a.anio) === String(anio),
  )
  const errs = {
    numero: !String(numero).trim()
      ? "Indica el N°."
      : isNaN(Number(numero)) || Number(numero) <= 0
        ? "Debe ser un número válido."
        : dupNumero
          ? `Ya existe una acción N°${numero} en ${anio}.`
          : "",
    titulo: !titulo.trim() ? "Indica el título." : "",
    anio: !String(anio).trim() || isNaN(Number(anio)) ? "Indica el año." : "",
    fechaInicio: !fechaInicio ? "Indica la fecha de inicio." : "",
    fechaTermino: !fechaTermino
      ? "Indica la fecha de término."
      : fechaInicio && fechaTermino < fechaInicio
        ? "No puede ser anterior al inicio."
        : "",
    comoDesarrollar: !comoDesarrollar.trim() ? "Describe cómo se desarrollará." : "",
    temas: !temas.trim() ? "Indica los temas." : "",
  }
  const valid = Object.values(errs).every((e) => !e)

  const save = async () => {
    setTouched(true)
    if (!valid) return
    const payload = {
      numero: Number(numero),
      titulo: titulo.trim(),
      anio: Number(anio),
      fechaInicio,
      fechaTermino,
      comoDesarrollar: comoDesarrollar.trim(),
      temas: temas.trim(),
    }
    setSaving(true)
    const res =
      mode === "create"
        ? await app.run(() => crearAccion(payload), { title: "Acción creada", text: `N°${numero} · ${anio}` })
        : await app.run(() => editarAccion(data!.id, payload), {
            title: "Cambios guardados",
            text: "Acción estratégica actualizada.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title={mode === "create" ? "Nueva acción estratégica" : "Editar acción estratégica"}
      sub={
        mode === "edit" ? (
          <span className="mono">
            N°{data!.numero} · {data!.anio}
          </span>
        ) : (
          "Plan de Reducción del Riesgo de Desastres"
        )
      }
      icon={
        <div className="confirm-icon" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
          <I.Target size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Crear acción" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <div className="form-grid">
          <Field
            label="N° de acción"
            required
            error={touched ? errs.numero : ""}
            hint={!touched || !errs.numero ? "Único por año." : ""}
          >
            <Input
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej. 1"
              invalid={touched && !!errs.numero}
            />
          </Field>
          <Field label="Año" required error={touched ? errs.anio : ""}>
            <Input
              type="number"
              min="2000"
              max="2100"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="2026"
              invalid={touched && !!errs.anio}
            />
          </Field>
          <Field label="Título" required error={touched ? errs.titulo : ""} full>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Fortalecer la red comunitaria de respuesta ante emergencias"
              invalid={touched && !!errs.titulo}
            />
          </Field>
          <Field label="Fecha de inicio" required error={touched ? errs.fechaInicio : ""}>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              invalid={touched && !!errs.fechaInicio}
            />
          </Field>
          <Field label="Fecha de término" required error={touched ? errs.fechaTermino : ""}>
            <Input
              type="date"
              value={fechaTermino}
              onChange={(e) => setFechaTermino(e.target.value)}
              invalid={touched && !!errs.fechaTermino}
            />
          </Field>
          <Field label="Cómo desarrollarla" required error={touched ? errs.comoDesarrollar : ""} full>
            <Textarea
              value={comoDesarrollar}
              onChange={(e) => setComoDesarrollar(e.target.value)}
              placeholder="Describe la estrategia y los pasos para desarrollar esta acción…"
              invalid={touched && !!errs.comoDesarrollar}
            />
          </Field>
          <Field
            label="Temas"
            required
            error={touched ? errs.temas : ""}
            full
            hint={!touched || !errs.temas ? "Ejes o temas que aborda la acción." : ""}
          >
            <Input
              value={temas}
              onChange={(e) => setTemas(e.target.value)}
              placeholder="Ej. Organización comunitaria · Primera respuesta · Mapas de riesgo"
              invalid={touched && !!errs.temas}
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Delete acción (bloqueado por actividades) ---------------- */
export function DeleteAccion({ a, fromDetail, onClose }: { a: Accion; fromDetail?: boolean; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const acts = app.actividadesDeAccion(a.id)
  const blocked = acts.length > 0

  return (
    <ConfirmDialog
      blocked={blocked}
      title={blocked ? "No se puede eliminar la acción" : "Eliminar acción estratégica"}
      message={
        blocked ? (
          <>
            La acción{" "}
            <span className="mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
              N°{a.numero} · {a.anio}
            </span>{" "}
            tiene actividades vinculadas y no puede eliminarse.
          </>
        ) : (
          <>
            ¿Confirmas eliminar la acción <b style={{ color: "var(--ink)" }}>{a.titulo}</b>? Esta acción no se puede
            deshacer.
          </>
        )
      }
      warn={
        blocked ? (
          <>
            Tiene{" "}
            <b>
              {acts.length} {acts.length === 1 ? "actividad vinculada" : "actividades vinculadas"}
            </b>
            . Para eliminarla, primero debes eliminar o reasignar esas actividades.
          </>
        ) : null
      }
      confirmLabel="Eliminar acción"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarAccion(a.id), {
          kind: "danger",
          title: "Acción eliminada",
          text: `N°${a.numero} · ${a.anio}`,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (fromDetail) app.nav({ name: "acciones" })
      }}
      onClose={onClose}
    />
  )
}

/* ===================================================================
   ACTIVIDADES
   =================================================================== */

export function ActividadDetail({ id }: { id: string }) {
  const app = useApp()
  const act = app.data.actividades.find((x) => x.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)
  const [attach, setAttach] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [delAdj, setDelAdj] = useState<Evidencia | null>(null)
  const [tab, setTab] = useState<"info" | "evidencia">("info")

  if (!act)
    return (
      <EmptyState
        title="Actividad no encontrada"
        action={
          <button className="btn btn--secondary" onClick={() => app.nav({ name: "acciones" })}>
            Volver
          </button>
        }
      />
    )

  const accion = app.accion(act.accionId)
  const ev = act.evidencia
  const autor = app.user(act.creadoPor)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="mono">Actividad</span>
            {accion && (
              <button className="entity-link" onClick={() => app.nav({ name: "accion", id: accion.id })}>
                <I.Target size={13} /> N°{accion.numero} · {accion.anio}
              </button>
            )}
          </span>
        }
        title={act.objetivo}
        sub={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <I.Calendar size={14} /> {fmtDateLong(act.fecha)}
          </span>
        }
        back={
          accion
            ? {
                label: `Acción N°${accion.numero} · ${accion.anio}`,
                onClick: () => app.nav({ name: "accion", id: accion.id }),
              }
            : { label: "Acciones estratégicas", onClick: () => app.nav({ name: "acciones" }) }
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
              <div className="seg" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "info"}
                  className={tab === "info" ? "on" : ""}
                  onClick={() => setTab("info")}
                >
                  <I.Activity size={14} /> Información
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "evidencia"}
                  className={tab === "evidencia" ? "on" : ""}
                  onClick={() => setTab("evidencia")}
                >
                  <I.Paperclip size={14} /> Evidencia <span className="count-pill">{ev.length}</span>
                </button>
              </div>
              {tab === "evidencia" && app.canEdit && ev.length > 0 && (
                <div className="panel__actions">
                  <button className="btn btn--secondary btn--sm" onClick={() => setAttach(true)}>
                    <I.Upload size={15} /> Adjuntar
                  </button>
                </div>
              )}
            </div>
            {tab === "info" ? (
              <div className="panel__body">
                <div className="kv">
                  <KV k="Fecha">
                    <span className="mono">{fmtDate(act.fecha)}</span>
                  </KV>
                  <KV k="Dirección">{act.direccion}</KV>
                  <KV k="Acción estratégica" full>
                    {accion ? (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                        <button className="entity-link" onClick={() => app.nav({ name: "accion", id: accion.id })}>
                          <I.Target size={13} /> Acción N°{accion.numero} · {accion.anio}
                        </button>
                        <span style={{ color: "var(--slate-600)" }}>{accion.titulo}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </KV>
                  <KV k="Participantes" full empty={!act.participantes}>
                    {act.participantes}
                  </KV>
                </div>
              </div>
            ) : (
              <div className="panel__body">
                {ev.length === 0 ? (
                  <EmptyState
                    icon={<I.Paperclip />}
                    title="Sin evidencia adjunta"
                    text="Adjunta imágenes (JPG, PNG) o documentos PDF que respalden la realización de esta actividad."
                    action={
                      app.canEdit && (
                        <button className="btn btn--secondary btn--sm" onClick={() => setAttach(true)}>
                          <I.Upload size={15} /> Adjuntar archivos
                        </button>
                      )
                    }
                  />
                ) : (
                  <div className="ev-grid">
                    {ev.map((f, idx) => {
                      const meta = fileMeta(f.nombre)
                      const isImg = f.tipo !== "pdf"
                      return (
                        <div key={f.id} className="ev-card">
                          <div
                            className={`ev-thumb ${f.tipo === "pdf" ? "ev-thumb--pdf" : ""}`}
                            onClick={() => setLightbox(idx)}
                          >
                            {isImg ? (
                              // eslint-disable-next-line @next/next/no-img-element -- servido por route handler con sesión
                              <img src={f.url} alt={f.nombre} />
                            ) : (
                              <div className="ev-thumb__type">
                                <I.FileText size={26} />
                                <span className="badge-type" style={{ background: meta.color }}>
                                  {meta.label}
                                </span>
                              </div>
                            )}
                            <div className="ev-thumb__zoom">
                              <I.Eye size={20} />
                            </div>
                          </div>
                          <div className="ev-card__foot">
                            <span className="ev-card__txt">
                              <span className="ev-card__name" title={f.nombre}>
                                {f.nombre}
                              </span>
                              <span className="ev-card__size">{fmtBytes(f.size)}</span>
                            </span>
                            <span className="ev-card__act">
                              <a
                                className="icon-btn"
                                title="Descargar"
                                href={`${f.url}?descargar=1`}
                                download={f.nombre}
                              >
                                <I.Download />
                              </a>
                              {app.canEdit && (
                                <button
                                  className="icon-btn icon-btn--danger"
                                  title="Eliminar adjunto"
                                  onClick={() => setDelAdj(f)}
                                >
                                  <I.Trash />
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
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
                    Registró la actividad
                  </div>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
                <I.Clock size={14} /> {fmtDateTime(act.creado)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {form && <ActividadForm mode="edit" data={act} accionId={act.accionId} onClose={() => setForm(false)} />}
      {del && <DeleteActividad act={act} fromDetail onClose={() => setDel(false)} />}
      {attach && <AdjuntarModal actividadId={act.id} onClose={() => setAttach(false)} />}
      {delAdj && <DeleteAdjunto f={delAdj} onClose={() => setDelAdj(null)} />}
      {lightbox != null && <EvidenceLightbox items={ev} index={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

/* ---------------- Form ---------------- */
export function ActividadForm({
  mode,
  data,
  accionId,
  onClose,
}: {
  mode: "create" | "edit"
  data?: Actividad
  accionId: string
  onClose: () => void
}) {
  const app = useApp()
  const accion = app.accion(accionId)
  const [fecha, setFecha] = useState(data?.fecha ?? "")
  const [direccion, setDireccion] = useState(data?.direccion ?? "")
  const [objetivo, setObjetivo] = useState(data?.objetivo ?? "")
  const [participantes, setParticipantes] = useState(data?.participantes ?? "")
  // Al editar se distinguen los adjuntos ya guardados (que se pueden quitar)
  // de los nuevos (que aún hay que subir).
  const [existentes, setExistentes] = useState<Evidencia[]>(data?.evidencia ?? [])
  const [quitados, setQuitados] = useState<string[]>([])
  const [nuevos, setNuevos] = useState<ArchivoStaged[]>([])
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const errs = {
    fecha: !fecha ? "Indica la fecha." : "",
    direccion: !direccion.trim() ? "Indica la dirección." : "",
    objetivo: !objetivo.trim() ? "Describe el objetivo." : "",
    participantes: !participantes.trim() ? "Indica los participantes." : "",
  }
  const valid = Object.values(errs).every((e) => !e)
  const total = existentes.length + nuevos.length

  const save = async () => {
    setTouched(true)
    if (!valid) return
    const datos = {
      accionId,
      fecha,
      direccion: direccion.trim(),
      objetivo: objetivo.trim(),
      participantes: participantes.trim(),
    }
    setSaving(true)

    if (mode === "create") {
      const fd = new FormData()
      fd.set("datos", JSON.stringify(datos))
      nuevos.forEach((n) => fd.append("archivos", n.file))
      const res = await app.run(() => crearActividad(fd), {
        title: "Actividad registrada",
        text: nuevos.length
          ? `Con ${nuevos.length} ${nuevos.length === 1 ? "archivo" : "archivos"} de evidencia.`
          : "Se vinculó a la acción estratégica.",
      })
      setSaving(false)
      if (res !== null) onClose()
      return
    }

    const res = await app.run(() => editarActividad(data!.id, datos), {
      title: "Cambios guardados",
      text: "Actividad actualizada.",
    })
    if (res === null) {
      setSaving(false)
      return
    }
    for (const id of quitados) {
      const r = await eliminarEvidencia(id)
      if (!r.ok) app.toast({ kind: "danger", title: "No se pudo quitar un adjunto", text: r.error })
    }
    if (nuevos.length) {
      const fd = new FormData()
      fd.set("actividadId", data!.id)
      nuevos.forEach((n) => fd.append("archivos", n.file))
      await app.run(() => adjuntarEvidencia(fd))
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title={mode === "create" ? "Nueva actividad" : "Editar actividad"}
      sub={
        accion ? (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <I.Target size={13} /> Acción N°{accion.numero} · {accion.anio}
          </span>
        ) : null
      }
      icon={
        <div className="confirm-icon" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
          <I.Activity size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Registrar actividad" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <div className="form-grid">
          <Field label="Fecha" required error={touched ? errs.fecha : ""}>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              invalid={touched && !!errs.fecha}
            />
          </Field>
          <Field label="Dirección" required error={touched ? errs.direccion : ""}>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej. Sede Social Villa Frei, Av. Grecia 4500"
              invalid={touched && !!errs.direccion}
            />
          </Field>
          <Field label="Objetivo" required error={touched ? errs.objetivo : ""} full>
            <Textarea
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Describe el objetivo de la actividad…"
              invalid={touched && !!errs.objetivo}
              style={{ minHeight: 72 }}
            />
          </Field>
          <Field label="Participantes" required error={touched ? errs.participantes : ""} full>
            <Textarea
              value={participantes}
              onChange={(e) => setParticipantes(e.target.value)}
              placeholder="Ej. Dirigentes J.V. N°12, equipo DGRD, Bomberos 5ª Cía."
              invalid={touched && !!errs.participantes}
              style={{ minHeight: 64 }}
            />
          </Field>
        </div>

        <div className="form-section">
          <div className="form-section__title">
            Evidencia{" "}
            {total > 0 && (
              <span className="count-pill" style={{ marginLeft: 6 }}>
                {total}
              </span>
            )}
          </div>
          <EvidenceDropzone onAdd={(items) => setNuevos((n) => [...n, ...items])} />
          {total > 0 && (
            <div className="ev-stage">
              {existentes.map((f) => (
                <StagedFile
                  key={f.id}
                  nombre={f.nombre}
                  size={f.size}
                  url={f.tipo === "pdf" ? null : f.url}
                  onRemove={() => {
                    setQuitados((q) => [...q, f.id])
                    setExistentes((e) => e.filter((x) => x.id !== f.id))
                  }}
                />
              ))}
              {nuevos.map((n) => (
                <StagedFile
                  key={n.id}
                  nombre={n.file.name}
                  size={n.file.size}
                  url={n.url}
                  onRemove={() => setNuevos((list) => list.filter((x) => x.id !== n.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Adjuntar evidencia a una actividad existente ---------------- */
export function AdjuntarModal({ actividadId, onClose }: { actividadId: string; onClose: () => void }) {
  const app = useApp()
  const [nuevos, setNuevos] = useState<ArchivoStaged[]>([])
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!nuevos.length) {
      onClose()
      return
    }
    const fd = new FormData()
    fd.set("actividadId", actividadId)
    nuevos.forEach((n) => fd.append("archivos", n.file))
    setSaving(true)
    const res = await app.run(() => adjuntarEvidencia(fd), {
      title: "Evidencia adjuntada",
      text: `${nuevos.length} ${nuevos.length === 1 ? "archivo agregado" : "archivos agregados"}.`,
    })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title="Adjuntar evidencia"
      sub="Imágenes JPG, PNG y PDF · hasta 10 MB por archivo"
      icon={
        <div className="confirm-icon" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
          <I.Upload size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={guardar} disabled={!nuevos.length || saving}>
            {saving
              ? "Subiendo…"
              : nuevos.length
                ? `Adjuntar ${nuevos.length} ${nuevos.length === 1 ? "archivo" : "archivos"}`
                : "Adjuntar"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <EvidenceDropzone onAdd={(items) => setNuevos((n) => [...n, ...items])} />
        {nuevos.length > 0 && (
          <div className="ev-stage">
            {nuevos.map((n) => (
              <StagedFile
                key={n.id}
                nombre={n.file.name}
                size={n.file.size}
                url={n.url}
                onRemove={() => setNuevos((list) => list.filter((x) => x.id !== n.id))}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ---------------- Delete actividad ---------------- */
export function DeleteActividad({
  act,
  fromDetail,
  onClose,
}: {
  act: Actividad
  fromDetail?: boolean
  onClose: () => void
}) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const nEv = act.evidencia.length

  return (
    <ConfirmDialog
      title="Eliminar actividad"
      message={<>¿Confirmas eliminar esta actividad? Esta acción no se puede deshacer.</>}
      warn={
        nEv > 0 ? (
          <>
            Se eliminarán también sus{" "}
            <b>
              {nEv} {nEv === 1 ? "archivo de evidencia" : "archivos de evidencia"}
            </b>
            .
          </>
        ) : null
      }
      confirmLabel="Eliminar actividad"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarActividad(act.id), {
          kind: "danger",
          title: "Actividad eliminada",
          text: nEv > 0 ? "Se eliminó junto a su evidencia." : undefined,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (fromDetail) app.nav({ name: "accion", id: act.accionId })
      }}
      onClose={onClose}
    />
  )
}

/* ---------------- Delete adjunto ---------------- */
export function DeleteAdjunto({ f, onClose }: { f: Evidencia; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)

  return (
    <ConfirmDialog
      title="Eliminar adjunto"
      message={
        <>
          ¿Confirmas eliminar el archivo <b style={{ color: "var(--ink)" }}>{f.nombre}</b>? La actividad y el resto de
          sus datos se mantienen intactos.
        </>
      }
      confirmLabel="Eliminar adjunto"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarEvidencia(f.id), {
          kind: "danger",
          title: "Adjunto eliminado",
          text: f.nombre,
        })
        setBusy(false)
        if (res !== null) onClose()
      }}
      onClose={onClose}
    />
  )
}
