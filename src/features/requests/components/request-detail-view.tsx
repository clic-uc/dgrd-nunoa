"use client"
import { DeliveryFormDialog } from "@/features/deliveries/components/delivery-form-dialog"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateTime } from "@/lib/format"
import { usePermission } from "@/providers/permissions"
import { useRequest } from "../queries"
import { RequestFormDialog } from "./request-form-dialog"
import { DeleteRequestDialog } from "./delete-request-dialog"
import { RequestStatusBadge } from "./request-status-badge"
import "@/features/deliveries/components/deliveries.css"

export function RequestDetailView({ id }: { id: string }) {
  const [creatingDelivery, setCreatingDelivery] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canUpdate = usePermission("requests", "update")
  const canDelete = usePermission("requests", "delete")
  const router = useRouter()
  const query = useRequest(id)
  const request = query.data
  if (query.isPending)
    return (
      <div className="delivery-page space-y-4" aria-busy="true" aria-label="Cargando solicitud">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  if (query.isError || !request)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar la solicitud</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
        <Link href="/solicitudes">Volver a solicitudes</Link>
      </div>
    )
  return (
    <div className="deliveries delivery-page">
      <Link href="/solicitudes" className="delivery-back">
        <ArrowLeft size={16} />
        Solicitudes
      </Link>
      <div className="delivery-page-head">
        <div>
          <span className="delivery-eyebrow">Emergencias · Solicitud</span>
          <h1 className="break-words">{request.folio}</h1>
          <p>
            <RequestStatusBadge status={request.status} />
          </p>
        </div>
        {(canUpdate || canDelete) && (
          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={15} />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Eliminar solicitud"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="delivery-detail-grid">
        <section className="delivery-panel">
          <h2>
            <FileText size={17} />
            Datos de la solicitud
          </h2>
          <dl className="delivery-kv">
            <div>
              <dt>Medio/fuente</dt>
              <dd className="break-words">{request.channel}</dd>
            </div>
            <div>
              <dt>Registrada por</dt>
              <dd>{request.creator.name}</dd>
            </div>
            <div>
              <dt>Fecha de creación</dt>
              <dd>{formatDateTime(request.createdAt)}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>{formatDateTime(request.updatedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Descripción</dt>
              <dd className="break-words whitespace-pre-wrap">{request.description || "Sin descripción"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Respuesta</dt>
              <dd className="break-words whitespace-pre-wrap">{request.response || "Sin respuesta"}</dd>
            </div>
          </dl>
        </section>
        <aside className="space-y-4">
          <section className="delivery-aside">
            <h2>Evento asociado</h2>
            {request.event ? (
              <div className="delivery-related">
                <Link href={`/eventos/${request.event.id}`} className="delivery-badge delivery-badge-event underline">
                  {request.event.folio}
                </Link>
                <span>{request.event.sector}</span>
              </div>
            ) : (
              <p>Sin evento asociado.</p>
            )}
          </section>
          <section className="delivery-aside">
            <h2>Entrega asociada</h2>
            {request.delivery ? (
              <div className="delivery-related">
                <Link href={`/entregas/${request.delivery.id}`} className="font-semibold hover:underline">
                  {request.delivery.folio}
                </Link>
                <span>
                  {request.delivery.beneficiary} · {formatDate(request.delivery.date)}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <p>Sin entrega asociada.</p>
                <Button onClick={() => setCreatingDelivery(true)}>Registrar entrega</Button>
              </div>
            )}
          </section>
          {request.delivery && canDelete && (
            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Esta solicitud no puede eliminarse mientras tenga una entrega vinculada. Puedes anularla.
            </p>
          )}
        </aside>
      </div>
      {creatingDelivery && <DeliveryFormDialog open defaultRequestId={request.id} onOpenChange={setCreatingDelivery} />}
      {editing && <RequestFormDialog request={request} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteRequestDialog
          request={request}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/solicitudes")}
        />
      )}
    </div>
  )
}
