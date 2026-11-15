"use client"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileText, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ApiError } from "../api"
import { useCreateRequest, useRequestOptions, useUpdateRequest } from "../queries"
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  requestFormSchema,
  type RequestDetail,
  type RequestFormValues,
  type RequestListItem,
} from "../schemas"

const FIELDS = ["channel", "description", "response", "status", "eventId"] as const

export function RequestFormDialog({
  request,
  onClose,
  onSaved,
}: {
  request?: RequestListItem | RequestDetail
  onClose: () => void
  onSaved?: (saved: RequestListItem) => void
}) {
  const id = useId()
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      channel: request?.channel ?? "",
      description: request?.description ?? "",
      response: request?.response ?? "",
      status: request?.status ?? "pending",
      eventId: request?.eventId ?? "",
    },
  })
  const options = useRequestOptions()
  const create = useCreateRequest()
  const update = useUpdateRequest(request?.id ?? "")
  const mutation = request ? update : create
  const errors = form.formState.errors
  const events = options.data?.events ?? []
  // Si el evento actual ya no aparece en las opciones, se conserva para no perderlo al guardar.
  const currentEventMissing = Boolean(
    request?.event && options.data && !events.some((event) => event.id === request.event?.id),
  )
  const eventHint = options.isPending
    ? "Cargando eventos…"
    : options.isError
      ? "No se pudieron cargar los eventos."
      : events.length === 0 && !request?.event
        ? "No hay eventos disponibles. Puedes guardar sin asociar uno."
        : "Selecciona «Sin evento asociado» para dejar la solicitud sin evento."
  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await mutation.mutateAsync({
        channel: values.channel,
        description: values.description || null,
        status: values.status,
        response: values.response || null,
        eventId: values.eventId || null,
      })
      toast.success(request ? "Solicitud actualizada." : "Solicitud registrada.")
      onClose()
      onSaved?.(saved)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const field of FIELDS) {
          const message = error.fieldErrors[field]?.[0]
          if (message) form.setError(field, { message })
        }
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la solicitud.")
    }
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto p-0 sm:max-w-[520px]"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <FileText size={19} />
            </span>
            {request ? `Editar solicitud ${request.folio}` : "Nueva solicitud"}
          </DialogTitle>
          <DialogDescription>
            {request
              ? "Actualiza el medio, el estado, la respuesta o el evento asociado."
              : "El folio, la fecha y el usuario se registran automáticamente."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={mutation.isPending} className="space-y-5 px-6 py-5">
            {request?.delivery && (
              <div
                role="note"
                className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
              >
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <p>
                  Esta solicitud tiene la entrega {request.delivery.folio} vinculada. Cambiar el evento también
                  actualiza el evento de esa entrega.
                </p>
              </div>
            )}
            <Field data-invalid={Boolean(errors.channel)}>
              <FieldLabel htmlFor={`${id}-channel`}>
                Medio/fuente <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${id}-channel`}
                placeholder="Ej. teléfono, correo o presencial"
                {...form.register("channel")}
                aria-invalid={Boolean(errors.channel)}
                aria-describedby={`${id}-channel-error`}
              />
              <FieldError id={`${id}-channel-error`} errors={[errors.channel]} />
            </Field>
            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel htmlFor={`${id}-status`}>Estado</FieldLabel>
              <select
                id={`${id}-status`}
                className="delivery-select"
                {...form.register("status")}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={`${id}-status-error`}
              >
                {REQUEST_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {REQUEST_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <FieldError id={`${id}-status-error`} errors={[errors.status]} />
            </Field>
            <Field data-invalid={Boolean(errors.eventId)}>
              <FieldLabel htmlFor={`${id}-event`}>
                Evento asociado <span className="text-muted-foreground font-normal">Opcional</span>
              </FieldLabel>
              <select
                id={`${id}-event`}
                className="delivery-select"
                {...form.register("eventId")}
                aria-invalid={Boolean(errors.eventId)}
                aria-describedby={`${id}-event-hint ${id}-event-error`}
              >
                <option value="">Sin evento asociado</option>
                {currentEventMissing && request?.event && (
                  <option value={request.event.id}>
                    {request.event.folio} — {request.event.sector}
                  </option>
                )}
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.folio} — {event.sector}
                  </option>
                ))}
              </select>
              <FieldDescription id={`${id}-event-hint`}>{eventHint}</FieldDescription>
              <FieldError id={`${id}-event-error`} errors={[errors.eventId]} />
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor={`${id}-description`}>Descripción (opcional)</FieldLabel>
              <Textarea
                id={`${id}-description`}
                {...form.register("description")}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={`${id}-description-error`}
              />
              <FieldError id={`${id}-description-error`} errors={[errors.description]} />
            </Field>
            <Field data-invalid={Boolean(errors.response)}>
              <FieldLabel htmlFor={`${id}-response`}>
                Respuesta <span className="text-muted-foreground font-normal">Opcional</span>
              </FieldLabel>
              <Textarea
                id={`${id}-response`}
                rows={5}
                placeholder="Describe la respuesta o gestión realizada."
                {...form.register("response")}
                aria-invalid={Boolean(errors.response)}
                aria-describedby={`${id}-response-error`}
              />
              <FieldError id={`${id}-response-error`} errors={[errors.response]} />
            </Field>
          </fieldset>
          <div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : request ? "Guardar cambios" : "Registrar solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
