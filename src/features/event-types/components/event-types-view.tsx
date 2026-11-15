"use client"
import { useId, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useEventTypes, useSaveEventType, useDeleteEventType } from "../queries"
import { eventTypeSchema, type EventType, type EventTypeInput } from "../schemas"
function Editor({ record, onClose }: { record?: EventType; onClose: () => void }) {
  const id = useId()
  const form = useForm<EventTypeInput>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: { name: record?.name ?? "" },
  })
  const save = useSaveEventType()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (save.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (save.isPending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{record ? "Editar tipo de evento" : "Nuevo tipo de evento"}</DialogTitle>
          <DialogDescription>Catálogo de clasificación de emergencias.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({ ...values, id: record?.id })
              toast.success("Tipo guardado.")
              onClose()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo guardar.")
            }
          })}
        >
          <Field>
            <FieldLabel htmlFor={id}>Nombre</FieldLabel>
            <Input
              id={id}
              {...form.register("name")}
              disabled={save.isPending}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby={`${id}-error`}
            />
            <FieldError id={`${id}-error`} errors={[form.formState.errors.name]} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export function EventTypesView() {
  const [search, setSearch] = useState("")
  const query = useEventTypes(useDebouncedValue(search))
  const [editing, setEditing] = useState<{ record?: EventType } | null>(null)
  const [deleting, setDeleting] = useState<EventType | null>(null)
  const remove = useDeleteEventType()
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <Link href="/eventos" className="underline">
        Volver a eventos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tipos de evento</h1>
        <Button onClick={() => setEditing({})}>Nuevo tipo</Button>
      </div>
      <Input
        aria-label="Buscar tipos de evento"
        placeholder="Buscar por nombre"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {query.isPending ? (
        <p role="status">Cargando tipos…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : query.data.data.length === 0 ? (
        <p>No hay tipos para esta búsqueda.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {query.data.data.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <strong>{record.name}</strong>
                <p className="text-muted-foreground text-sm">{record._count.events} eventos asociados</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing({ record })}>
                  Editar
                </Button>
                <Button variant="destructive" disabled={record._count.events > 0} onClick={() => setDeleting(record)}>
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <Editor record={editing.record} onClose={() => setEditing(null)} />}
      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {deleting.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Solo se pueden eliminar tipos sin eventos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending}
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    await remove.mutateAsync(deleting.id)
                    setDeleting(null)
                    toast.success("Tipo eliminado.")
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo eliminar.")
                  }
                }}
              >
                {remove.isPending ? "Eliminando…" : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  )
}
