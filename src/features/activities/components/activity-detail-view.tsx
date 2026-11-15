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
import { formatDate } from "@/lib/format"
import { useActivity, useDeleteActivity } from "../queries"
import { outsideActionPeriod } from "../schemas"
import { ActivityEditor } from "./activity-editor"
export function ActivityDetailView({ id }: { id: string }) {
  const query = useActivity(id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const remove = useDeleteActivity()
  const router = useRouter()
  if (query.isPending)
    return (
      <p role="status" className="p-6">
        Cargando actividad…
      </p>
    )
  if (query.isError)
    return (
      <div role="alert" className="p-6">
        <p>{query.error.message}</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </div>
    )
  const activity = query.data
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-5 sm:p-8">
      <Link className="underline" href={`/plan/acciones/${activity.actionId}`}>
        Volver a {activity.action.title}
      </Link>
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">Actividad</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button variant="destructive" disabled={activity._count.evidence > 0} onClick={() => setDeleting(true)}>
            Eliminar
          </Button>
        </div>
      </div>
      {outsideActionPeriod(activity.date.slice(0, 10), activity.action.startDate, activity.action.endDate) && (
        <p role="note" className="rounded-lg border p-3">
          Esta actividad queda fuera del periodo de su acción.
        </p>
      )}
      <dl className="space-y-4 rounded-xl border p-5">
        {[
          ["Fecha", formatDate(activity.date)],
          ["Dirección", activity.location],
          ["Objetivo", activity.objective],
          ["Participantes", activity.participants],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="break-words whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        La evidencia es opcional. La gestión de archivos se incorporará después de definir su almacenamiento.
      </p>
      {editing && <ActivityEditor action={activity.action} record={activity} onClose={() => setEditing(false)} />}
      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(false)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar actividad</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará esta actividad. La acción estratégica se conserva. No se puede deshacer.
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
                    router.push(`/plan/acciones/${activity.actionId}`)
                    toast.success("Actividad eliminada.")
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
