"use client"

/* ============================================================
   Administración · Usuarios
   En el mockup era un placeholder; acá es CRUD real sobre el
   plugin `admin` de Better Auth.
   ============================================================ */
import { useState } from "react"
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  PasswordInput,
  SearchBox,
  Select,
} from "@/components/kit"
import { I } from "@/components/icons"
import { fmtDate, initials } from "@/lib/format"
import { useApp } from "@/components/app/provider"
import {
  cambiarEstadoUsuario,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  restablecerPassword,
} from "@/server/actions/admin"
import type { Rol, Usuario } from "@/lib/types"

export function UsuariosList() {
  const app = useApp()
  const [q, setQ] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"activo" | "inactivo" | "todos">("activo")
  const [form, setForm] = useState<{ mode: "create" | "edit"; data?: Usuario } | null>(null)
  const [pass, setPass] = useState<Usuario | null>(null)
  const [estado, setEstado] = useState<Usuario | null>(null)
  const [borrar, setBorrar] = useState<Usuario | null>(null)

  const rows = app.data.usuarios
    .filter((u) => (estadoFiltro === "todos" ? true : u.estado === estadoFiltro))
    .filter((u) => (u.nombre + " " + u.apellido + " " + u.correo).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const counts = {
    activos: app.data.usuarios.filter((u) => u.estado === "activo").length,
    inactivos: app.data.usuarios.filter((u) => u.estado === "inactivo").length,
    todos: app.data.usuarios.length,
  }

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Administración"
        title="Usuarios"
        sub="Cuentas del sistema: alta, rol, activación y restablecimiento de contraseña."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ mode: "create" })}>
            <I.UserPlus size={16} /> Nuevo usuario
          </button>
        }
      />

      <div className="toolbar">
        <div className="seg">
          <button className={estadoFiltro === "activo" ? "on" : ""} onClick={() => setEstadoFiltro("activo")}>
            Activos <span className="count-pill">{counts.activos}</span>
          </button>
          <button className={estadoFiltro === "inactivo" ? "on" : ""} onClick={() => setEstadoFiltro("inactivo")}>
            Inactivos <span className="count-pill">{counts.inactivos}</span>
          </button>
          <button className={estadoFiltro === "todos" ? "on" : ""} onClick={() => setEstadoFiltro("todos")}>
            Todos <span className="count-pill">{counts.todos}</span>
          </button>
        </div>
        <div className="toolbar__spacer" />
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre o correo…" />
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={<I.Users />}
            title="No hay usuarios"
            text={q || estadoFiltro !== "todos" ? "No se encontraron usuarios con los filtros aplicados." : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th style={{ width: 140 }}>Rol</th>
                  <th style={{ width: 120 }}>Estado</th>
                  <th style={{ width: 130 }}>Creado</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {initials(u.nombre, u.apellido)}
                        </span>
                        <span className="cell-strong">
                          {u.nombre} {u.apellido}
                          {u.id === app.me.id && (
                            <span className="muted" style={{ fontWeight: 400 }}>
                              {" "}
                              (tú)
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="cell-muted mono">{u.correo}</td>
                    <td>
                      <Badge variant={u.rol === "admin" ? "yellow" : "neutral"} dot>
                        {u.rol === "admin" ? "Administrador" : "Usuario regular"}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={u.estado === "activo" ? "green" : "red"} dot>
                        {u.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td>
                      <span className="mono cell-muted">{fmtDate(u.creado)}</span>
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button className="icon-btn" title="Editar" onClick={() => setForm({ mode: "edit", data: u })}>
                          <I.Pencil />
                        </button>
                        <button className="icon-btn" title="Restablecer contraseña" onClick={() => setPass(u)}>
                          <I.KeyRound />
                        </button>
                        <button
                          className={`icon-btn ${u.estado === "activo" ? "icon-btn--danger" : ""}`}
                          title={u.estado === "activo" ? "Desactivar" : "Reactivar"}
                          onClick={() => setEstado(u)}
                          disabled={u.id === app.me.id && u.estado === "activo"}
                        >
                          {u.estado === "activo" ? <I.Ban /> : <I.RotateCcw />}
                        </button>
                        {estadoFiltro === "inactivo" && (
                          <button
                            className="icon-btn icon-btn--danger"
                            title={
                              u.registros > 0
                                ? "No se puede eliminar: la cuenta tiene registros en el historial"
                                : "Eliminar usuario"
                            }
                            onClick={() => setBorrar(u)}
                          >
                            <I.Trash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <UsuarioForm mode={form.mode} data={form.data} onClose={() => setForm(null)} />}
      {pass && <PasswordModal u={pass} onClose={() => setPass(null)} />}
      {estado && <EstadoModal u={estado} onClose={() => setEstado(null)} />}
      {borrar && <EliminarModal u={borrar} onClose={() => setBorrar(null)} />}
    </div>
  )
}

function UsuarioForm({ mode, data, onClose }: { mode: "create" | "edit"; data?: Usuario; onClose: () => void }) {
  const app = useApp()
  const [nombre, setNombre] = useState(data?.nombre ?? "")
  const [apellido, setApellido] = useState(data?.apellido ?? "")
  const [correo, setCorreo] = useState(data?.correo ?? "")
  const [rol, setRol] = useState<Rol>(data?.rol ?? "regular")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const dupCorreo = app.data.usuarios.some(
    (u) => u.id !== data?.id && u.correo.toLowerCase() === correo.trim().toLowerCase(),
  )
  const errs = {
    nombre: !nombre.trim() ? "Indica el nombre." : "",
    apellido: !apellido.trim() ? "Indica el apellido." : "",
    correo: !correo.trim()
      ? "Indica el correo."
      : !/^\S+@\S+\.\S+$/.test(correo.trim())
        ? "Correo no válido."
        : dupCorreo
          ? "Ya existe una cuenta con ese correo."
          : "",
    password: mode === "create" && password.length < 8 ? "Mínimo 8 caracteres." : "",
  }
  const valid = Object.values(errs).every((e) => !e)

  const save = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    const base = { nombre: nombre.trim(), apellido: apellido.trim(), correo: correo.trim(), rol }
    const res =
      mode === "create"
        ? await app.run(() => crearUsuario({ ...base, password }), {
            title: "Usuario creado",
            text: `${base.nombre} ${base.apellido}`,
          })
        : await app.run(() => editarUsuario(data!.id, base), {
            title: "Cambios guardados",
            text: "Usuario actualizado.",
          })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="sm"
      onClose={onClose}
      title={mode === "create" ? "Nuevo usuario" : "Editar usuario"}
      sub={
        mode === "edit" ? <span className="mono">{data!.correo}</span> : "Se crea con acceso por correo y contraseña."
      }
      icon={
        <div className="confirm-icon" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
          <I.User size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <Field label="Nombre" required error={touched ? errs.nombre : ""}>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            invalid={touched && !!errs.nombre}
            autoFocus
          />
        </Field>
        <Field label="Apellido" required error={touched ? errs.apellido : ""}>
          <Input value={apellido} onChange={(e) => setApellido(e.target.value)} invalid={touched && !!errs.apellido} />
        </Field>
        <Field
          label="Correo electrónico"
          required
          error={touched ? errs.correo : ""}
          hint={mode === "edit" ? "El correo no se puede cambiar una vez creada la cuenta." : ""}
        >
          <Input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            invalid={touched && !!errs.correo}
            disabled={mode === "edit"}
            placeholder="nombre.apellido@nunoa.cl"
          />
        </Field>
        {mode === "create" && (
          <Field label="Contraseña inicial" required error={touched ? errs.password : ""} hint="Mínimo 8 caracteres.">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={touched && !!errs.password}
              autoComplete="new-password"
            />
          </Field>
        )}
        <Field
          label="Rol"
          hint={
            data?.id === app.me.id
              ? "No puedes cambiar tu propio rol."
              : "Los administradores gestionan cuentas y catálogos."
          }
        >
          <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)} disabled={data?.id === app.me.id}>
            <option value="regular">Usuario regular</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

function PasswordModal({ u, onClose }: { u: Usuario; onClose: () => void }) {
  const app = useApp()
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const err = touched && password.length < 8 ? "Mínimo 8 caracteres." : ""

  const save = async () => {
    setTouched(true)
    if (password.length < 8) return
    setSaving(true)
    const res = await app.run(() => restablecerPassword(u.id, password), {
      title: "Contraseña restablecida",
      text: `${u.nombre} ${u.apellido}`,
    })
    setSaving(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="sm"
      onClose={onClose}
      title="Restablecer contraseña"
      sub={<span className="mono">{u.correo}</span>}
      icon={
        <div className="confirm-icon" style={{ background: "var(--yellow-50)", color: "var(--yellow-700)" }}>
          <I.KeyRound size={19} />
        </div>
      }
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Restablecer"}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <div className="info-box" style={{ marginBottom: 16 }}>
          <I.Info size={16} />
          <div>
            Las sesiones abiertas de esta cuenta seguirán activas. Comunica la nueva contraseña de forma segura.
          </div>
        </div>
        <Field label="Nueva contraseña" required error={err} hint="Mínimo 8 caracteres.">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!err}
            autoComplete="new-password"
            autoFocus
          />
        </Field>
      </div>
    </Modal>
  )
}

function EstadoModal({ u, onClose }: { u: Usuario; onClose: () => void }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const desactivar = u.estado === "activo"

  return (
    <ConfirmDialog
      kind={desactivar ? "danger" : "warn"}
      title={desactivar ? "Desactivar usuario" : "Reactivar usuario"}
      message={
        desactivar ? (
          <>
            ¿Confirmas desactivar a{" "}
            <b style={{ color: "var(--ink)" }}>
              {u.nombre} {u.apellido}
            </b>
            ? No podrá iniciar sesión.
          </>
        ) : (
          <>
            ¿Confirmas reactivar a{" "}
            <b style={{ color: "var(--ink)" }}>
              {u.nombre} {u.apellido}
            </b>
            ? Volverá a tener acceso al sistema.
          </>
        )
      }
      warn={
        desactivar ? (
          <>Su historial se mantiene intacto: los registros que creó siguen visibles y atribuidos a esta cuenta.</>
        ) : null
      }
      confirmLabel={desactivar ? "Desactivar" : "Reactivar"}
      busy={busy}
      onConfirm={async () => {
        setBusy(true)
        const res = await app.run(() => cambiarEstadoUsuario(u.id, !desactivar), {
          kind: desactivar ? "danger" : "success",
          title: desactivar ? "Usuario desactivado" : "Usuario reactivado",
          text: `${u.nombre} ${u.apellido}`,
        })
        setBusy(false)
        if (res !== null) onClose()
      }}
      onClose={onClose}
    />
  )
}

/**
 * Borrado definitivo. Estilo GitHub: hay que escribir el correo de la cuenta para
 * habilitar el botón. Si la cuenta tiene historial (relaciones `onDelete: Restrict`)
 * el modal abre en modo bloqueado y solo explica por qué no se puede.
 */
function EliminarModal({ u, onClose }: { u: Usuario; onClose: () => void }) {
  const app = useApp()
  const [texto, setTexto] = useState("")
  const [busy, setBusy] = useState(false)
  const bloqueado = u.registros > 0
  const coincide = texto.trim().toLowerCase() === u.correo.toLowerCase()

  const confirmar = async () => {
    if (!coincide) return
    setBusy(true)
    const res = await app.run(() => eliminarUsuario(u.id), {
      kind: "danger",
      title: "Usuario eliminado",
      text: `${u.nombre} ${u.apellido}`,
    })
    setBusy(false)
    if (res !== null) onClose()
  }

  return (
    <Modal
      size="sm"
      onClose={onClose}
      title={bloqueado ? "No se puede eliminar" : "Eliminar usuario"}
      sub={<span className="mono">{u.correo}</span>}
      icon={
        <div className={`confirm-icon confirm-icon--${bloqueado ? "warn" : "danger"}`}>
          {bloqueado ? <I.AlertTriangle size={20} /> : <I.Trash size={20} />}
        </div>
      }
      footer={
        bloqueado ? (
          <button className="btn btn--secondary" onClick={onClose}>
            Entendido
          </button>
        ) : (
          <>
            <button className="btn btn--secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button className="btn btn--danger" onClick={confirmar} disabled={!coincide || busy}>
              {busy ? "Eliminando…" : "Eliminar usuario"}
            </button>
          </>
        )
      }
    >
      <div className="modal__body">
        <p className="muted" style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.6 }}>
          {bloqueado ? (
            <>
              <b style={{ color: "var(--ink)" }}>
                {u.nombre} {u.apellido}
              </b>{" "}
              creó {u.registros} registro{u.registros === 1 ? "" : "s"} en el sistema. La cuenta debe conservarse para
              mantener la trazabilidad del historial.
            </>
          ) : (
            <>
              Vas a eliminar definitivamente la cuenta de{" "}
              <b style={{ color: "var(--ink)" }}>
                {u.nombre} {u.apellido}
              </b>
              .
            </>
          )}
        </p>
        <div className="warn-box" style={{ marginBottom: bloqueado ? 0 : 16 }}>
          <I.AlertTriangle size={17} />
          <div>
            {bloqueado ? (
              <>Puedes dejarla inactiva: no podrá iniciar sesión y sus registros siguen atribuidos a ella.</>
            ) : (
              <>Esta acción no se puede deshacer: se borran la cuenta y sus sesiones abiertas.</>
            )}
          </div>
        </div>
        {!bloqueado && (
          <Field
            label="Para confirmar, escribe el correo de la cuenta"
            hint={
              <>
                Escribe <span className="mono">{u.correo}</span>
              </>
            }
          >
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && coincide && !busy) confirmar()
              }}
            />
          </Field>
        )}
      </div>
    </Modal>
  )
}
