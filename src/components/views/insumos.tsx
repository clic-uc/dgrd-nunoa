"use client"

/* ============================================================
   Insumos — portado de src/insumos.jsx
   Catálogo (sin stock). Historial de entregas por insumo.
   ============================================================ */
import { useState } from "react"
import { Badge, ConfirmDialog, EmptyState, Field, Input, Modal, PageHead, SearchBox, Select } from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import { SectionTabs } from "@/components/app/section-tabs"
import { crearInsumo, editarInsumo, eliminarInsumo } from "@/server/actions/emergencias"
import type { Insumo } from "@/lib/types"

export const UNIDADES = ["unidad", "par", "rollo", "corte", "kg", "litro", "caja"]

/* ---------------- List ---------------- */
export function InsumosList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [form, setForm] = useState<{ mode: "create" | "edit"; data?: Insumo } | null>(null)
  const [del, setDel] = useState<Insumo | null>(null)

  const rows = app.data.insumos
    .filter((x) => x.tipo.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.tipo.localeCompare(b.tipo))

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={<SectionTabs group="ayudas" active="insumos" />}
        title="Insumos"
        sub="Catálogo de insumos disponibles para registrar en las entregas. No maneja stock."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ mode: "create" })}>
            <I.Plus size={16} /> Nuevo insumo
          </button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__spacer" />
        <SearchBox value={q} onChange={setQ} placeholder="Buscar insumo…" />
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.Box />}
            title="No hay insumos"
            text={q ? "No se encontraron insumos con ese nombre." : "Aún no se han registrado insumos en el catálogo."}
            action={
              <button className="btn btn--primary" onClick={() => setForm({ mode: "create" })}>
                <I.Plus size={16} /> Nuevo insumo
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo de insumo</th>
                  <th style={{ width: 140 }}>Unidad</th>
                  <th className="num" style={{ width: 150 }}>
                    Entregas
                  </th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const n = app.entregasConInsumo(x.id).length
                  return (
                    <tr key={x.id} className="clickable" onClick={() => app.nav({ name: "insumo", id: x.id })}>
                      <td className="cell-strong">{x.tipo}</td>
                      <td>
                        <span className="tag">{x.unidad}</span>
                      </td>
                      <td className="num">
                        {n > 0 ? <span className="count-pill">{n}</span> : <span className="cell-muted">—</span>}
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Historial"
                            onClick={() => app.nav({ name: "insumo", id: x.id })}
                          >
                            <I.Eye />
                          </button>
                          <button
                            className="icon-btn"
                            title="Editar"
                            onClick={() => setForm({ mode: "edit", data: x })}
                          >
                            <I.Pencil />
                          </button>
                          <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(x)}>
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

      {form && <InsumoForm mode={form.mode} data={form.data} onClose={() => setForm(null)} />}
      {del && <DeleteInsumo x={del} onClose={() => setDel(null)} />}
    </div>
  )
}

/* ---------------- Detail / historial ---------------- */
export function InsumoDetail({ id }: { id: string }) {
  const app = useApp()
  const x = app.data.insumos.find((i) => i.id === id)
  const [form, setForm] = useState(false)
  const [del, setDel] = useState(false)
  const [asc, setAsc] = useState(false)

  if (!x)
    return (
      <EmptyState
        title="Insumo no encontrado"
        action={
          <button className="btn btn--secondary" onClick={() => app.nav({ name: "insumos" })}>
            Volver
          </button>
        }
      />
    )

  const hist = app
    .entregasConInsumo(x.id)
    .map((en) => ({
      en,
      cant: en.items.find((i) => i.insumoId === x.id)?.cantidad ?? 0,
      ev: app.eventoDeEntrega(en),
    }))
    .sort((a, b) => (asc ? (a.en.fecha < b.en.fecha ? -1 : 1) : a.en.fecha < b.en.fecha ? 1 : -1))
  const total = hist.reduce((a, h) => a + h.cant, 0)

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Ayudas primera respuesta · Insumo"
        title={x.tipo}
        sub={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            Unidad: <span className="tag">{x.unidad}</span>
          </span>
        }
        back={{ label: "Insumos", onClick: () => app.nav({ name: "insumos" }) }}
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

      <div className="stat-row" style={{ marginBottom: 18, background: "var(--surface)", maxWidth: 460 }}>
        <div className="stat">
          <div className="stat__v">{hist.length}</div>
          <div className="stat__k">Entregas que lo incluyen</div>
        </div>
        <div className="stat">
          <div className="stat__v">{total}</div>
          <div className="stat__k">Total distribuido ({x.unidad})</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>
            <I.Truck size={17} /> Historial de entregas <span className="count-pill">{hist.length}</span>
          </h2>
          <div className="panel__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setAsc((a) => !a)}>
              <I.Calendar size={14} /> {asc ? "Más antiguas primero" : "Más recientes primero"}
            </button>
          </div>
        </div>
        <div className="panel__body--flush">
          {hist.length === 0 ? (
            <EmptyState
              icon={<I.Truck />}
              title="Sin entregas"
              text="Este insumo aún no ha sido incluido en ninguna entrega."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Fecha</th>
                    <th style={{ width: 150 }}>Evento</th>
                    <th>Beneficiario</th>
                    <th className="num" style={{ width: 130 }}>
                      Cantidad
                    </th>
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {hist.map((h) => (
                    <tr key={h.en.id} className="clickable" onClick={() => app.nav({ name: "entrega", id: h.en.id })}>
                      <td>
                        <span className="mono cell-muted">{fmtDate(h.en.fecha)}</span>
                      </td>
                      <td>
                        {h.ev ? (
                          <Badge variant="yellow" dot>
                            {h.ev.folio}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="cell-strong">{h.en.beneficiario}</td>
                      <td className="num mono cell-strong">
                        {h.cant}{" "}
                        <span className="cell-muted" style={{ fontWeight: 400 }}>
                          {x.unidad}
                        </span>
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => app.nav({ name: "entrega", id: h.en.id })}>
                            <I.ChevronRight />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form && <InsumoForm mode="edit" data={x} onClose={() => setForm(false)} />}
      {del && <DeleteInsumo x={x} fromDetail onClose={() => setDel(false)} />}
    </div>
  )
}

/* ---------------- Form ---------------- */
export function InsumoForm({ mode, data, onClose }: { mode: "create" | "edit"; data?: Insumo; onClose: () => void }) {
  const app = useApp()
  const [tipo, setTipo] = useState(data?.tipo ?? "")
  const [unidad, setUnidad] = useState(data?.unidad ?? "unidad")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const refs = data ? app.entregasConInsumo(data.id).length : 0

  const dup = app.data.insumos.some(
    (i) => i.tipo.trim().toLowerCase() === tipo.trim().toLowerCase() && i.unidad === unidad && i.id !== data?.id,
  )
  const errTipo =
    touched && !tipo.trim()
      ? "Indica el nombre del insumo."
      : dup
        ? "Ya existe un insumo con este nombre y unidad."
        : ""

  const save = async () => {
    setTouched(true)
    if (!tipo.trim() || dup) return
    setSaving(true)
    const res =
      mode === "create"
        ? await app.run(() => crearInsumo({ tipo: tipo.trim(), unidad }), { title: "Insumo creado", text: tipo.trim() })
        : await app.run(() => editarInsumo(data!.id, { tipo: tipo.trim(), unidad }), {
            title: "Cambios guardados",
            text: "Insumo actualizado.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="sm"
      onClose={onClose}
      title={mode === "create" ? "Nuevo insumo" : "Editar insumo"}
      icon={
        <div className="confirm-icon" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
          <I.Box size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Crear insumo" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        {mode === "edit" && refs > 0 && (
          <div className="warn-box" style={{ marginBottom: 16 }}>
            <I.AlertTriangle size={17} />
            <div>
              Este insumo está referenciado en{" "}
              <b>
                {refs} {refs === 1 ? "entrega" : "entregas"}
              </b>
              . Cambiar su nombre o unidad afectará cómo se muestra en esos registros.
            </div>
          </div>
        )}
        <Field label="Tipo de insumo" required error={errTipo}>
          <Input
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Ej. Frazada"
            invalid={!!errTipo}
            autoFocus
          />
        </Field>
        <Field label="Unidad de medida" required hint="Cómo se cuantifica este insumo en las entregas.">
          <Select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

/* ---------------- Delete (bloqueado si está referenciado) ---------------- */
export function DeleteInsumo({ x, fromDetail, onClose }: { x: Insumo; fromDetail?: boolean; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const refs = app.entregasConInsumo(x.id).length
  const blocked = refs > 0

  return (
    <ConfirmDialog
      blocked={blocked}
      title={blocked ? "No se puede eliminar el insumo" : "Eliminar insumo"}
      message={
        blocked ? (
          <>
            El insumo <b style={{ color: "var(--ink)" }}>{x.tipo}</b> está en uso y no puede eliminarse.
          </>
        ) : (
          <>
            ¿Confirmas eliminar el insumo <b style={{ color: "var(--ink)" }}>{x.tipo}</b> del catálogo?
          </>
        )
      }
      warn={
        blocked ? (
          <>
            Está referenciado en{" "}
            <b>
              {refs} {refs === 1 ? "entrega" : "entregas"}
            </b>
            . Para eliminarlo, primero debes quitarlo de esas entregas.
          </>
        ) : null
      }
      confirmLabel="Eliminar insumo"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarInsumo(x.id), {
          kind: "danger",
          title: "Insumo eliminado",
          text: x.tipo,
        })
        setBusy(false)
        if (res === null) return
        onClose()
        if (fromDetail) app.nav({ name: "insumos" })
      }}
      onClose={onClose}
    />
  )
}
