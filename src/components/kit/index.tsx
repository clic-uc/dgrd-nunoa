"use client"

/* ============================================================
   Primitivas de UI compartidas — portadas del mockup (src/ui.jsx)
   ============================================================ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { createPortal } from "react-dom"
import { I } from "@/components/icons"
import { useIsClient } from "./client-state"

export { useIsClient, usePersistedState } from "./client-state"

/* ---------------- Toast ---------------- */
export type ToastKind = "success" | "danger" | "info"
export type ToastInput = { kind?: ToastKind; title?: string; text?: string }
export type Toast = ToastInput & { id: string }

export const ToastCtx = createContext<(t: ToastInput) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

let _tseq = 0

/** Provee `toast()` y renderiza la pila. Se monta una sola vez, en el layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: ToastInput) => {
    const id = `t-${++_tseq}`
    setToasts((ts) => [...ts, { ...t, id }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3800)
  }, [])

  const dismiss = (id: string) => setToasts((ts) => ts.filter((x) => x.id !== id))

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastHost toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind ?? "success"}`} role="status">
          <span className="toast__icon">
            {t.kind === "danger" ? (
              <I.AlertCircle size={18} />
            ) : t.kind === "info" ? (
              <I.Info size={18} />
            ) : (
              <I.CheckCircle size={18} />
            )}
          </span>
          <div>
            {t.title && <b>{t.title}</b>}
            {t.title && t.text ? " · " : ""}
            {t.text}
          </div>
          <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
            <I.X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Badge ---------------- */
export type BadgeVariant = "neutral" | "yellow" | "green" | "red" | "amber" | "blue" | "outline"

export function Badge({
  variant = "neutral",
  dot,
  children,
}: {
  variant?: BadgeVariant
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  title,
  sub,
  icon,
  onClose,
  size,
  children,
  footer,
}: {
  title?: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  onClose?: () => void
  size?: "sm" | "lg" | "xl"
  children?: ReactNode
  footer?: ReactNode
}) {
  const isClient = useIsClient()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!isClient) return null

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className={`modal ${size ? "modal--" + size : ""}`} role="dialog" aria-modal="true">
        {title && (
          <div className="modal__head">
            {icon}
            <div style={{ minWidth: 0 }}>
              <h3>{title}</h3>
              {sub && <div className="sub">{sub}</div>}
            </div>
            <div className="modal__close">
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <I.X size={18} />
              </button>
            </div>
          </div>
        )}
        {children}
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Confirm dialog ---------------- */
export function ConfirmDialog({
  kind = "danger",
  title,
  message,
  warn,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
  blocked,
  busy,
}: {
  kind?: "danger" | "warn"
  title: ReactNode
  message: ReactNode
  warn?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onClose: () => void
  blocked?: boolean
  busy?: boolean
}) {
  return (
    <Modal size="sm" onClose={onClose}>
      <div className="modal__head" style={{ borderBottom: "none", paddingBottom: 4 }}>
        <div className={`confirm-icon confirm-icon--${blocked ? "warn" : kind === "danger" ? "danger" : "warn"}`}>
          {blocked ? <I.AlertTriangle size={20} /> : <I.Trash size={20} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3>{title}</h3>
        </div>
        <div className="modal__close">
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <I.X size={18} />
          </button>
        </div>
      </div>
      <div className="modal__body" style={{ paddingTop: 6 }}>
        <p className="muted" style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.6 }}>
          {message}
        </p>
        {warn && (
          <div className={blocked ? "warn-box" : "info-box"}>
            <I.AlertTriangle size={17} />
            <div>{warn}</div>
          </div>
        )}
      </div>
      <div className="modal__foot">
        <button className="btn btn--secondary" onClick={onClose} disabled={busy}>
          {blocked ? "Entendido" : cancelLabel}
        </button>
        {!blocked && (
          <button
            className={`btn ${kind === "danger" ? "btn--danger" : "btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Eliminando…" : confirmLabel}
          </button>
        )}
      </div>
    </Modal>
  )
}

/* ---------------- Form fields ---------------- */
export function Field({
  label,
  required,
  optional,
  hint,
  error,
  children,
  full,
}: {
  label?: ReactNode
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  full?: boolean
}) {
  return (
    <div className="field" style={full ? { gridColumn: "1 / -1" } : undefined}>
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="req">*</span>}
          {optional && <span className="optional">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="field__error">
          <I.AlertCircle size={13} />
          {error}
        </div>
      ) : hint ? (
        <div className="field__hint">{hint}</div>
      ) : null}
    </div>
  )
}

export function Input({ invalid, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? "input--invalid" : ""}`} {...p} />
}

export function Textarea({ invalid, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`textarea ${invalid ? "textarea--invalid" : ""}`} {...p} />
}

export function Select({ invalid, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="select-wrap">
      <select className={`select ${invalid ? "select--invalid" : ""}`} {...p}>
        {children}
      </select>
      <I.ChevronDown size={16} />
    </div>
  )
}

export function PasswordInput({ invalid, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-affix">
      <input className={`input ${invalid ? "input--invalid" : ""}`} type={show ? "text" : "password"} {...p} />
      <button
        type="button"
        className="input-affix__btn"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        {show ? <I.EyeOff size={17} /> : <I.Eye size={17} />}
      </button>
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="search">
      <I.Search size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon ?? <I.Inbox />}</div>
      <div className="empty__title">{title}</div>
      {text && <div className="empty__text">{text}</div>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

/* ---------------- Page header ---------------- */
export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
  back,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  back?: { label: string; onClick: () => void }
}) {
  return (
    <div>
      {back && (
        <button className="back-link" onClick={back.onClick}>
          <I.ArrowLeft size={15} />
          {back.label}
        </button>
      )}
      <div className="page-head">
        <div className="page-head__main">
          {eyebrow && <div className="page-head__eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {sub && <div className="page-head__sub">{sub}</div>}
        </div>
        {actions && <div className="page-head__actions">{actions}</div>}
      </div>
    </div>
  )
}

/* ---------------- KV detail item ---------------- */
export function KV({
  k,
  children,
  empty,
  full,
}: {
  k: ReactNode
  children?: ReactNode
  empty?: boolean
  full?: boolean
}) {
  return (
    <div className="kv__item" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div className="kv__k">{k}</div>
      <div className={`kv__v ${empty ? "empty" : ""} ${full ? "long" : ""}`}>
        {empty ? "Sin información" : children}
      </div>
    </div>
  )
}

/* ---------------- Drawer (detalle lateral) ---------------- */
export function DrawerShell({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
}) {
  const isClient = useIsClient()

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [open, onClose])

  if (!isClient) return null

  return createPortal(
    <div className={`drawer-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer__head">
          <div className="drawer__title">
            {eyebrow && <span className="drawer__eyebrow">{eyebrow}</span>}
            <span>{title}</span>
          </div>
          <button className="icon-btn drawer__close" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <I.X />
          </button>
        </div>
        <div className="drawer__body scroll">{open && children}</div>
      </aside>
    </div>,
    document.body,
  )
}

/* ---------------- Popover que cierra al clic fuera ---------------- */
export function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null)
  // El callback va por ref para que el listener se registre una sola vez, sin
  // obligar a quien llama a memoizar la función que pasa.
  const cb = useRef(onOutside)
  useEffect(() => {
    cb.current = onOutside
  }, [onOutside])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current()
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return ref
}
