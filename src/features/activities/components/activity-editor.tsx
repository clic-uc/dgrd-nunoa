"use client"
import { useId } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { activitySchema, outsideActionPeriod, type ActivityInput } from "../schemas"
import { useSaveActivity } from "../queries"
export function ActivityEditor({
  action,
  record,
  onClose,
}: {
  action: { id: string; startDate: string; endDate: string }
  record?: ActivityInput & { id: string }
  onClose: () => void
}) {
  const id = useId()
  const form = useForm<ActivityInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      actionId: action.id,
      date: record?.date.slice(0, 10) ?? "",
      objective: record?.objective ?? "",
      location: record?.location ?? "",
      participants: record?.participants ?? "",
    },
  })
  const date = useWatch({ control: form.control, name: "date" })
  const save = useSaveActivity()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (save.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (save.isPending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{record ? "Editar actividad" : "Nueva actividad"}</DialogTitle>
          <DialogDescription>Fecha, dirección, objetivo y participantes son obligatorios.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({ ...values, id: record?.id })
              toast.success("Actividad guardada.")
              onClose()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo guardar.")
            }
          })}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            {(
              [
                ["date", "Fecha", "date"],
                ["location", "Dirección", "text"],
                ["objective", "Objetivo", "textarea"],
                ["participants", "Participantes", "textarea"],
              ] as const
            ).map(([name, label, type]) => (
              <Field key={name}>
                <FieldLabel htmlFor={`${id}-${name}`}>{label} *</FieldLabel>
                {type === "textarea" ? (
                  <Textarea
                    id={`${id}-${name}`}
                    {...form.register(name)}
                    aria-invalid={Boolean(form.formState.errors[name])}
                    aria-describedby={`${id}-${name}-error`}
                  />
                ) : (
                  <Input
                    id={`${id}-${name}`}
                    type={type}
                    {...form.register(name)}
                    aria-invalid={Boolean(form.formState.errors[name])}
                    aria-describedby={`${id}-${name}-error`}
                  />
                )}
                <FieldError id={`${id}-${name}-error`} errors={[form.formState.errors[name]]} />
              </Field>
            ))}
            {date && outsideActionPeriod(date, action.startDate, action.endDate) && (
              <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                La fecha está fuera del periodo de la acción estratégica. Puedes guardar igualmente.
              </p>
            )}
          </fieldset>
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
