"use client"

/* ============================================================
   Administración · Configuración
   Catálogo de tipos de evento. En el mockup era un placeholder.
   ============================================================ */
import { useState } from "react"
import { ConfirmDialog, EmptyState, Field, Input, Modal, PageHead, SearchBox } from "@/components/kit"
import { I } from "@/components/icons"
import { useApp } from "@/components/app/provider"
import { crearTipoEvento, editarTipoEvento, eliminarTipoEvento } from "@/server/actions/admin"
import type { TipoEvento } from "@/lib/types"

export function ConfiguracionView() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [form, setForm] = useState<{ mode: "create" | "edit"; data?: TipoEvento } | null>(null)
  const [del, setDel] = useState<TipoEvento | null>(null)

  const usos = (id: string) => app.data.eventos.filter((e) => e.tipoId === id).length

  const rows = app.data.tiposEvento
    .filter((t) => t.nombre.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Administración"
        title="Configuración"
        sub="Catálogos administrables del sistema. Los tipos de evento alimentan el formulario de registro de eventos."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ mode: "create" })}>
            <I.Plus size={16} /> Nuevo tipo
          </button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__spacer" />
        <SearchBox value={q} onChange={setQ} placeholder="Buscar tipo de evento…" />
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>
            <I.Siren size={17} /> Tipos de evento <span className="count-pill">{app.data.tiposEvento.length}</span>
          </h2>
        </div>
        <div className="panel__body--flush">
          {rows.length === 0 ? (
            <EmptyState
              icon={<I.Siren />}
              title="No hay tipos de evento"
              text={
                q ? "No se encontraron tipos con ese nombre." : "Registra los tipos que usará el módulo de Eventos."
              }
              action={
                <button className="btn btn--primary" onClick={() => setForm({ mode: "create" })}>
                  <I.Plus size={16} /> Nuevo tipo
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th className="num" style={{ width: 150 }}>
                      Eventos que lo usan
                    </th>
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const n = usos(t.id)
                    return (
                      <tr key={t.id}>
                        <td className="cell-strong">{t.nombre}</td>
                        <td className="num">
                          {n > 0 ? <span className="count-pill">{n}</span> : <span className="cell-muted">—</span>}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setForm({ mode: "edit", data: t })}
                            >
                              <I.Pencil />
                            </button>
                            <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDel(t)}>
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
      </div>

      {form && <TipoForm mode={form.mode} data={form.data} onClose={() => setForm(null)} />}
      {del && <DeleteTipo t={del} usos={usos(del.id)} onClose={() => setDel(null)} />}
    </div>
  )
}

function TipoForm({ mode, data, onClose }: { mode: "create" | "edit"; data?: TipoEvento; onClose: () => void }) {
  const app = useApp()
  const [nombre, setNombre] = useState(data?.nombre ?? "")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const usos = data ? app.data.eventos.filter((e) => e.tipoId === data.id).length : 0

  const dup = app.data.tiposEvento.some(
    (t) => t.id !== data?.id && t.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
  )
  const err = touched && !nombre.trim() ? "Indica el nombre." : dup ? "Ya existe un tipo con ese nombre." : ""

  const save = async () => {
    setTouched(true)
    if (!nombre.trim() || dup) return
    setSaving(true)
    const res =
      mode === "create"
        ? await app.run(() => crearTipoEvento(nombre), { title: "Tipo creado", text: nombre.trim() })
        : await app.run(() => editarTipoEvento(data!.id, nombre), {
            title: "Cambios guardados",
            text: "Tipo de evento actualizado.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="sm"
      onClose={onClose}
      title={mode === "create" ? "Nuevo tipo de evento" : "Editar tipo de evento"}
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
            {saving ? "Guardando…" : mode === "create" ? "Crear tipo" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        {mode === "edit" && usos > 0 && (
          <div className="warn-box" style={{ marginBottom: 16 }}>
            <I.AlertTriangle size={17} />
            <div>
              Este tipo está en uso por{" "}
              <b>
                {usos} {usos === 1 ? "evento" : "eventos"}
              </b>
              . Cambiar el nombre no afecta a los eventos ya registrados, solo cómo se muestran.
            </div>
          </div>
        )}
        <Field label="Nombre" required error={err}>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Anegamiento"
            invalid={!!err}
            autoFocus
          />
        </Field>
      </div>
    </Modal>
  )
}

function DeleteTipo({ t, usos, onClose }: { t: TipoEvento; usos: number; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const blocked = usos > 0

  return (
    <ConfirmDialog
      blocked={blocked}
      title={blocked ? "No se puede eliminar el tipo" : "Eliminar tipo de evento"}
      message={
        blocked ? (
          <>
            El tipo <b style={{ color: "var(--ink)" }}>{t.nombre}</b> está en uso y no puede eliminarse.
          </>
        ) : (
          <>
            ¿Confirmas eliminar el tipo <b style={{ color: "var(--ink)" }}>{t.nombre}</b> del catálogo?
          </>
        )
      }
      warn={
        blocked ? (
          <>
            Está referenciado por{" "}
            <b>
              {usos} {usos === 1 ? "evento" : "eventos"}
            </b>
            . Para eliminarlo, primero debes reasignar esos eventos a otro tipo.
          </>
        ) : null
      }
      confirmLabel="Eliminar tipo"
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => eliminarTipoEvento(t.id), {
          kind: "danger",
          title: "Tipo eliminado",
          text: t.nombre,
        })
        setBusy(false)
        if (res !== null) onClose()
      }}
      onClose={onClose}
    />
  )
}
