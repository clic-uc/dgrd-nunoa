"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Box, CalendarDays, Clock, MapPin, Pencil, Trash2, Truck, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelivery } from "../queries"
import { formatDate } from "@/lib/format"
import { usePermission } from "@/providers/permissions"
import { DeliveryFormDialog } from "./delivery-form-dialog"
import { DeleteDeliveryDialog } from "./delete-delivery-dialog"
import "./deliveries.css"

export function DeliveryDetailView({
  id,
  embedded = false,
  onDeleted,
}: {
  id: string
  embedded?: boolean
  onDeleted?: () => void
}) {
  const query = useDelivery(id)
  // El usuario normal no accede a solicitudes: para él el folio queda como texto.
  const canReadEvents = usePermission("events", "read")
  const canReadRequests = usePermission("requests", "read")
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const delivery = query.data
  if (query.isPending)
    return (
      <div className="space-y-4 p-6" aria-busy="true" aria-label="Cargando entrega">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  if (query.isError || !delivery)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar la entrega</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
        {!embedded && <Link href="/entregas">Volver a entregas</Link>}
      </div>
    )
  return (
    <div className={`deliveries ${embedded ? "delivery-embedded" : "delivery-page"}`}>
      {!embedded && (
        <Link href="/entregas" className="delivery-back">
          <ArrowLeft size={16} /> Entregas
        </Link>
      )}
      <div className="delivery-page-head">
        <div>
          <span className="delivery-eyebrow">{delivery.folio}</span>
          <h1>Detalle de entrega</h1>
          <p className="flex items-center gap-2">
            <CalendarDays size={14} />
            {formatDate(delivery.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {embedded && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/entregas/${id}`} aria-label="Abrir página de la entrega">
                <ExternalLink size={16} />
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label="Eliminar entrega"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="delivery-detail-grid">
        <div className="space-y-5">
          <section className="delivery-panel">
            <h2>
              <Truck size={17} />
              Datos de la entrega
            </h2>
            <dl className="delivery-kv">
              <div>
                <dt>RUT del beneficiario</dt>
                <dd>{delivery.beneficiaryRut ?? "Sin RUT histórico; completar al editar"}</dd>
              </div>
              <div>
                <dt>Beneficiario</dt>
                <dd>{delivery.beneficiary}</dd>
              </div>
              <div>
                <dt>Junta vecinal</dt>
                <dd>
                  {delivery.neighborhoodAssociation ? (
                    <>
                      <Link
                        href={`/juntas-vecinales/${delivery.neighborhoodAssociationId}`}
                        className="hover:underline"
                      >
                        N°{delivery.neighborhoodAssociation.number} · {delivery.neighborhoodAssociation.name}
                      </Link>
                      {!delivery.neighborhoodAssociation.active && (
                        <span className="delivery-badge ml-2">Inactiva</span>
                      )}
                    </>
                  ) : (
                    "Sin junta vecinal"
                  )}
                </dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{delivery.contact || "Sin contacto"}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDate(delivery.date)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Dirección</dt>
                <dd className="flex items-center gap-2">
                  <MapPin size={14} />
                  {delivery.address}
                </dd>
              </div>
            </dl>
          </section>
          <section className="delivery-panel">
            <h2>
              <Box size={17} />
              Insumos entregados <span className="delivery-count">{delivery.items.length}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="delivery-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Unidad</th>
                    <th className="text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.items.map((item) => (
                    <tr key={item.supplyId}>
                      <td className="font-semibold">
                        <Link href={`/insumos/${item.supplyId}`} className="hover:underline">
                          {item.supply.type}
                        </Link>
                      </td>
                      <td>{item.supply.unit}</td>
                      <td className="text-right font-mono">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="delivery-aside">
            <h2>Solicitud asociada</h2>
            {delivery.request ? (
              <div className="delivery-related">
                {canReadRequests ? (
                  <Link href={`/solicitudes/${delivery.request.id}`} className="font-semibold hover:underline">
                    {delivery.request.folio}
                  </Link>
                ) : (
                  <strong>{delivery.request.folio}</strong>
                )}
                <span>{delivery.request.channel}</span>
              </div>
            ) : (
              <p>Sin solicitud asociada.</p>
            )}
          </section>
          <section className="delivery-aside">
            <h2>Evento</h2>
            {delivery.event ? (
              <div className="delivery-related">
                {canReadEvents ? (
                  <Link
                    href={`/eventos/${delivery.event.id}`}
                    className="delivery-badge delivery-badge-event underline"
                  >
                    {delivery.event.folio}
                  </Link>
                ) : (
                  <span className="delivery-badge delivery-badge-event">{delivery.event.folio}</span>
                )}
                <span>
                  {delivery.event.type.name} · {delivery.event.sector}
                </span>
              </div>
            ) : (
              <p>Sin evento</p>
            )}
          </section>
          <section className="delivery-aside">
            <h2>Registro</h2>
            <strong>{delivery.creator.name}</strong>
            <p>Registró la entrega</p>
            <p className="mt-3 flex items-center gap-2">
              <Clock size={14} />
              {new Intl.DateTimeFormat("es-CL", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Santiago",
              }).format(new Date(delivery.createdAt))}
            </p>
          </section>
        </aside>
      </div>
      <DeliveryFormDialog open={editing} onOpenChange={setEditing} delivery={delivery} />
      <DeleteDeliveryDialog
        delivery={deleting ? delivery : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          if (embedded) onDeleted?.()
          else router.push("/entregas")
        }}
      />
    </div>
  )
}
