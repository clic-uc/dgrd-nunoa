"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { RequestFormDialog } from "@/features/requests/components/request-form-dialog"
import { formatDate } from "@/lib/format"
import { useEvent, useDeleteEvent } from "../queries"
import { EventEditor } from "./event-editor"
export function EventDetailView({ id }: { id: string }) {
  const query = useEvent(id)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const remove = useDeleteEvent()
  const router = useRouter()
  if (query.isPending)
    return (
      <p role="status" className="p-6">
        Cargando evento…
      </p>
    )
  if (query.isError)
    return (
      <div role="alert" className="p-6">
        <p>{query.error.message}</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
        <Link href="/eventos">Volver a eventos</Link>
      </div>
    )
  const event = query.data
  const linked = event._count.requests + event._count.deliveries > 0
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <Link href="/eventos" className="underline">
        Volver a eventos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {event.folio} · {event.type.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button onClick={() => setCreating(true)}>Nueva solicitud</Button>
          <Button variant="destructive" disabled={linked} onClick={() => setDeleting(true)}>
            Eliminar
          </Button>
        </div>
      </div>
      {linked && (
        <p className="text-muted-foreground text-sm">
          El evento conserva solicitudes o entregas vinculadas y no puede eliminarse.
        </p>
      )}
      <dl className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
        {[
          ["Fecha", formatDate(event.date)],
          ["Sector o dirección", event.sector],
          ["Personas afectadas", event.affectedCount ?? "Sin dato"],
          ["Instituciones", event.institutions],
          ["Acciones", event.actions],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="break-words whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Solicitudes</h2>
        {event.requests.length ? (
          <ul className="space-y-2">
            {event.requests.map((request) => (
              <li key={request.id}>
                <Link className="underline" href={`/solicitudes/${request.id}`}>
                  {request.folio} · {request.channel}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin solicitudes.</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Entregas</h2>
        {event.deliveries.length ? (
          <ul className="space-y-2">
            {event.deliveries.map((delivery) => (
              <li key={delivery.id}>
                <Link className="underline" href={`/entregas/${delivery.id}`}>
                  {delivery.folio} · {delivery.beneficiary} · {formatDate(delivery.date)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin entregas.</p>
        )}
      </section>
      {editing && <EventEditor record={event} onClose={() => setEditing(false)} />}
      {creating && (
        <RequestFormDialog
          defaultEventId={event.id}
          onClose={() => setCreating(false)}
          onSaved={(saved) => router.push(`/solicitudes/${saved.id}`)}
        />
      )}
      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(false)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {event.folio}</AlertDialogTitle>
              <AlertDialogDescription>
                Solo se eliminará este evento sin relaciones. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending}
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    await remove.mutateAsync(id)
                    router.push("/eventos")
                    toast.success("Evento eliminado.")
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo eliminar.")
                  }
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  )
}
