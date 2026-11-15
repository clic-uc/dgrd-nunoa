"use client"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ApiError } from "@/features/deliveries/api"
import { useEventTypes } from "@/features/event-types/queries"
import { eventSchema, type EventInput, type EventRecord } from "../schemas"
import { useSaveEvent } from "../queries"
export function EventEditor({ record, onClose }: { record?: EventRecord; onClose: () => void }) {
  const id = useId()
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      date: record?.date.slice(0, 10) ?? "",
      sector: record?.sector ?? "",
      typeId: record?.typeId ?? "",
      affectedCount: record?.affectedCount ?? null,
      institutions: record?.institutions ?? "",
      actions: record?.actions ?? "",
    },
  })
  const types = useEventTypes()
  const save = useSaveEvent()
  const errors = form.formState.errors
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={(e) => {
          if (save.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (save.isPending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{record ? `Editar ${record.folio}` : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            Registra la emergencia y las acciones realizadas. El folio se asigna automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({ ...values, id: record?.id })
              toast.success("Evento guardado.")
              onClose()
            } catch (e) {
              if (e instanceof ApiError && e.fieldErrors)
                for (const [key, messages] of Object.entries(e.fieldErrors))
                  if (key in values && messages?.[0]) form.setError(key as keyof EventInput, { message: messages[0] })
              toast.error(e instanceof Error ? e.message : "No se pudo guardar.")
            }
          })}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <Field>
              <FieldLabel htmlFor={`${id}-typeId`}>Tipo de evento *</FieldLabel>
              <select
                id={`${id}-typeId`}
                className="delivery-select"
                {...form.register("typeId")}
                aria-invalid={Boolean(errors.typeId)}
                aria-describedby={`${id}-typeId-error`}
              >
                <option value="">Selecciona un tipo</option>
                {types.data?.data.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <FieldError id={`${id}-typeId-error`} errors={[errors.typeId]} />
              {types.isPending ? (
                <p role="status">Cargando tipos…</p>
              ) : types.isError ? (
                <Button type="button" variant="outline" onClick={() => types.refetch()}>
                  Reintentar carga de tipos
                </Button>
              ) : types.data?.data.length === 0 ? (
                <Link href="/administracion/tipos-evento" className="underline">
                  Crear un tipo de evento primero
                </Link>
              ) : null}
            </Field>
            {(
              [
                ["date", "Fecha", "date"],
                ["sector", "Sector o dirección", "text"],
                ["institutions", "Instituciones", "text"],
                ["actions", "Acciones realizadas", "textarea"],
              ] as const
            ).map(([name, label, type]) => (
              <Field key={name}>
                <FieldLabel htmlFor={`${id}-${name}`}>{label} *</FieldLabel>
                {type === "textarea" ? (
                  <Textarea
                    id={`${id}-${name}`}
                    {...form.register(name)}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={`${id}-${name}-error`}
                  />
                ) : (
                  <Input
                    id={`${id}-${name}`}
                    type={type}
                    {...form.register(name)}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={`${id}-${name}-error`}
                  />
                )}
                <FieldError id={`${id}-${name}-error`} errors={[errors[name]]} />
              </Field>
            ))}
            <Field>
              <FieldLabel htmlFor={`${id}-affectedCount`}>Personas afectadas (opcional)</FieldLabel>
              <Input
                id={`${id}-affectedCount`}
                type="number"
                min="0"
                step="1"
                {...form.register("affectedCount", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
                aria-invalid={Boolean(errors.affectedCount)}
                aria-describedby={`${id}-affectedCount-error`}
              />
              <FieldError id={`${id}-affectedCount-error`} errors={[errors.affectedCount]} />
            </Field>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={save.isPending || !types.data}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
