"use client"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useDeleteRequest } from "../queries"
import { ApiError } from "../api"
import type { RequestDetail, RequestListItem } from "../schemas"

type LinkedDelivery = { id: string; folio: string } | null

function isLinkedDelivery(value: unknown): value is LinkedDelivery {
  return (
    value === null ||
    (typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      typeof (value as { folio?: unknown }).folio === "string")
  )
}

export function DeleteRequestDialog({
  request,
  onClose,
  onDeleted,
}: {
  request: RequestListItem | RequestDetail
  onClose: () => void
  onDeleted?: () => void
}) {
  const mutation = useDeleteRequest()
  // La entrega que el usuario está viendo; el servidor rechaza el borrado si cambió.
  const [delivery, setDelivery] = useState<LinkedDelivery>(
    request.delivery ? { id: request.delivery.id, folio: request.delivery.folio } : null,
  )
  async function remove() {
    try {
      await mutation.mutateAsync({ id: request.id, expectedDeliveryId: delivery?.id ?? null })
      toast.success("Solicitud eliminada.")
      onClose()
      onDeleted?.()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.details && "delivery" in error.details) {
        const current = error.details.delivery
        if (isLinkedDelivery(current)) setDelivery(current)
      }
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la solicitud.")
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar solicitud {request.folio}</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Confirmas eliminar esta solicitud? Esta acción no se puede deshacer.
            {request.event && ` El evento ${request.event.folio} se conserva.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {delivery && (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
          >
            No se puede eliminar: tiene la entrega <strong>{delivery.folio}</strong> vinculada. Puedes anular la
            solicitud.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending || Boolean(delivery)}
            onClick={(event) => {
              event.preventDefault()
              void remove()
            }}
          >
            {mutation.isPending ? "Eliminando…" : delivery ? "Solicitud con entrega" : "Eliminar solicitud"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
