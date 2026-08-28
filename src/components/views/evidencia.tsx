"use client"

/* ============================================================
   Evidencia — dropzone, fila en staging y lightbox.
   Portado de src/acciones.jsx. A diferencia del mockup, los
   archivos se suben de verdad: acá solo se preparan y previsualizan.
   ============================================================ */
import { useEffect, useRef, useState } from "react"
import { Modal } from "@/components/kit"
import { I } from "@/components/icons"
import { fileMeta, fmtBytes } from "@/lib/format"
import { useToast } from "@/components/kit"
import type { Evidencia } from "@/lib/types"

export const MAX_FILE = 10 * 1024 * 1024 // 10 MB
export const ACCEPT = ".jpg,.jpeg,.png,.pdf"
const EXT_OK = ["jpg", "jpeg", "png", "pdf"]

/** Archivo aún no subido, con su URL de previsualización local. */
export type ArchivoStaged = { id: string; file: File; url: string | null }

let _fseq = 0

export function stageFile(file: File): ArchivoStaged {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  const esImg = ext !== "pdf"
  return { id: `f-${++_fseq}`, file, url: esImg ? URL.createObjectURL(file) : null }
}

export function EvidenceDropzone({ onAdd }: { onAdd: (items: ArchivoStaged[]) => void }) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const ingest = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    const ok: ArchivoStaged[] = []
    const rejected: string[] = []
    files.forEach((f) => {
      const ext = (f.name.split(".").pop() ?? "").toLowerCase()
      if (!EXT_OK.includes(ext)) {
        rejected.push(`${f.name} (formato no permitido)`)
        return
      }
      if (f.size > MAX_FILE) {
        rejected.push(`${f.name} (supera 10 MB)`)
        return
      }
      ok.push(stageFile(f))
    })
    if (ok.length) onAdd(ok)
    if (rejected.length) toast({ kind: "danger", title: "Archivos no agregados", text: rejected.join(" · ") })
  }

  return (
    <div
      className="dropzone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        ingest(e.dataTransfer.files)
      }}
      style={over ? { borderColor: "var(--yellow)", background: "var(--yellow-50)" } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          ingest(e.target.files)
          e.target.value = ""
        }}
      />
      <div className="dropzone__icon">
        <I.Upload size={26} />
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
        Arrastra archivos aquí o haz clic para seleccionar
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
        Imágenes JPG, PNG y PDF · hasta 10 MB por archivo
      </div>
    </div>
  )
}

/** Fila de archivo en staging (formularios / modal de adjuntar). */
export function StagedFile({
  nombre,
  size,
  url,
  onRemove,
}: {
  nombre: string
  size: number
  url: string | null
  onRemove: () => void
}) {
  const meta = fileMeta(nombre)
  return (
    <div className="ev-stage__row">
      <span className="ev-stage__ico" style={{ background: url ? "transparent" : meta.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob/URL local, no optimizable */}
        {url ? <img src={url} alt="" /> : meta.label}
      </span>
      <span className="ev-stage__txt">
        <span className="ev-stage__name">{nombre}</span>
        <span className="ev-stage__size">{fmtBytes(size)}</span>
      </span>
      <button className="icon-btn icon-btn--danger" title="Quitar" onClick={onRemove}>
        <I.X size={16} />
      </button>
    </div>
  )
}

/* ---------------- Lightbox ---------------- */
export function EvidenceLightbox({
  items,
  index,
  onClose,
}: {
  items: Evidencia[]
  index: number
  onClose: () => void
}) {
  const [i, setI] = useState(index)
  const ev = items[i]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + items.length) % items.length)
      if (e.key === "ArrowRight") setI((v) => (v + 1) % items.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length])

  if (!ev) return null
  const meta = fileMeta(ev.nombre)
  const isImg = ev.tipo !== "pdf"

  return (
    <Modal
      size="xl"
      onClose={onClose}
      title={ev.nombre}
      sub={`${meta.label} · ${fmtBytes(ev.size)}`}
      icon={
        <div className="confirm-icon" style={{ background: meta.color, color: "#fff" }}>
          <I.Paperclip size={18} />
        </div>
      }
      footer={
        <>
          <span className="left muted" style={{ fontSize: 12.5 }}>
            {items.length > 1 ? `${i + 1} de ${items.length}` : ""}
          </span>
          <button className="btn btn--secondary" onClick={onClose}>
            Cerrar
          </button>
          <a className="btn btn--primary" href={`${ev.url}?descargar=1`} download={ev.nombre}>
            <I.Download size={15} /> Descargar
          </a>
        </>
      }
    >
      <div className="lightbox-stage">
        {items.length > 1 && (
          <button
            className="lightbox-nav lightbox-nav--prev"
            onClick={() => setI((v) => (v - 1 + items.length) % items.length)}
            aria-label="Anterior"
          >
            <I.ChevronLeft size={20} />
          </button>
        )}
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element -- servido por route handler con sesión
          <img src={ev.url} alt={ev.nombre} />
        ) : (
          <iframe src={ev.url} title={ev.nombre} />
        )}
        {items.length > 1 && (
          <button
            className="lightbox-nav lightbox-nav--next"
            onClick={() => setI((v) => (v + 1) % items.length)}
            aria-label="Siguiente"
          >
            <I.ChevronRight size={20} />
          </button>
        )}
      </div>
    </Modal>
  )
}
