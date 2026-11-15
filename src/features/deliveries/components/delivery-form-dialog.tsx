"use client"

import Link from "next/link"
import { useId } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Truck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ApiError } from "../api"
import { useCreateDelivery, useUpdateDelivery, useDeliveryOptions } from "../queries"
import { deliveryFormSchema, toDeliveryPayload, type Delivery, type DeliveryFormValues } from "../schemas"

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}
type DeliveryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery?: Delivery
}

export function DeliveryFormDialog(props: DeliveryFormDialogProps) {
  // Cada apertura o cambio de registro inicia un formulario nuevo. Los refetch
  // del mismo registro mantienen esta instancia y sus cambios sin guardar.
  return props.open ? <DeliveryFormContent key={props.delivery?.id ?? "new"} {...props} /> : null
}

function DeliveryFormContent({ open, onOpenChange, delivery }: DeliveryFormDialogProps) {
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      beneficiary: delivery?.beneficiary ?? "",
      neighborhoodAssociationId: delivery?.neighborhoodAssociationId ?? "",
      contact: delivery?.contact ?? "",
      address: delivery?.address ?? "",
      date: delivery?.date.slice(0, 10) ?? today(),
      requestId: delivery?.requestId ?? "",
      items: delivery
        ? delivery.items.map((item) => ({
            type: item.supply.type,
            supplyId: item.supplyId,
            quantity: String(item.quantity),
          }))
        : [{ type: "", supplyId: "", quantity: "" }],
    },
  })
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "items" })
  const options = useDeliveryOptions()
  const associations =
    options.data?.neighborhoodAssociations.filter(
      (association) => association.active || association.id === delivery?.neighborhoodAssociationId,
    ) ?? []
  const supplies = options.data?.supplies ?? []
  const types = Array.from(new Set(supplies.map((supply) => supply.type)))
  const requests =
    options.data?.requests.filter((request) => !request.delivery || request.delivery.id === delivery?.id) ?? []
  const requestId = useWatch({ control: form.control, name: "requestId" })
  const selectedRequest = requests.find((request) => request.id === requestId)
  const values = useWatch({ control: form.control, name: "items" })
  const create = useCreateDelivery()
  const edit = useUpdateDelivery(delivery?.id ?? "")
  const mutation = delivery ? edit : create
  const id = useId()
  const errors = form.formState.errors
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(toDeliveryPayload(values))
      toast.success(delivery ? "Entrega actualizada." : "Entrega registrada.")
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in values && messages?.[0])
            form.setError(field as keyof DeliveryFormValues, { message: messages[0] })
        }
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la entrega.")
    }
  })
  const pending = mutation.isPending
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value)
      }}
    >
      <DialogContent
        className="delivery-form flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]"
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <Truck size={20} />
            </span>
            {delivery ? "Editar entrega" : "Registrar entrega"}
          </DialogTitle>
          <DialogDescription>
            {delivery?.folio ?? "Datos del beneficiario e insumos entregados."}
            {selectedRequest?.event ? ` · Evento ${selectedRequest.event.folio}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="min-h-0 overflow-y-auto">
          <fieldset disabled={pending} className="space-y-5 px-6 py-5 disabled:opacity-70">
            {options.isPending && <p role="status">Cargando juntas vecinales, solicitudes e insumos…</p>}
            {options.isError && (
              <div role="alert">
                <p>No se pudieron cargar las opciones.</p>
                <Button type="button" variant="outline" onClick={() => options.refetch()}>
                  Reintentar
                </Button>
              </div>
            )}
            <Field data-invalid={Boolean(errors.requestId)}>
              <FieldLabel htmlFor={`${id}-request`}>
                Solicitud asociada <span className="text-muted-foreground font-normal">Opcional</span>
              </FieldLabel>
              <select
                id={`${id}-request`}
                className="delivery-select"
                {...form.register("requestId")}
                aria-invalid={Boolean(errors.requestId)}
                aria-describedby={`${id}-request-hint ${id}-request-error`}
              >
                <option value="">Sin solicitud asociada</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.folio} — {request.channel} · {request.event?.folio ?? "sin evento"}
                  </option>
                ))}
              </select>
              <p id={`${id}-request-hint`} className="text-muted-foreground text-xs">
                Si responde a una solicitud, selecciónala. El evento se heredará de ella.
              </p>
              <FieldError id={`${id}-request-error`} errors={[errors.requestId]} />
            </Field>
            <Field data-invalid={Boolean(errors.neighborhoodAssociationId)}>
              <FieldLabel htmlFor={`${id}-association`}>
                Junta vecinal <span className="text-muted-foreground font-normal">Opcional</span>
              </FieldLabel>
              <select
                id={`${id}-association`}
                className="delivery-select"
                {...form.register("neighborhoodAssociationId")}
                aria-invalid={Boolean(errors.neighborhoodAssociationId)}
                aria-describedby={`${id}-association-error`}
              >
                <option value="">Sin junta vecinal</option>
                {associations.map((association) => (
                  <option key={association.id} value={association.id}>
                    N°{association.number} · {association.name}
                    {association.active ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
              <FieldError id={`${id}-association-error`} errors={[errors.neighborhoodAssociationId]} />
              {options.data && associations.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No hay juntas activas.{" "}
                  <Link href="/juntas-vecinales" className="underline">
                    Gestionar juntas vecinales
                  </Link>
                </p>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["date", "Fecha", "date", ""],
                  ["beneficiary", "Beneficiario", "text", "Nombre del beneficiario o comité"],
                  ["contact", "Contacto", "text", "Teléfono o correo"],
                  ["address", "Dirección", "text", "Calle, número, depto/casa"],
                ] as const
              ).map(([name, label, type, placeholder]) => (
                <Field
                  key={name}
                  className={name === "address" ? "sm:col-span-2" : ""}
                  data-invalid={Boolean(errors[name])}
                >
                  <FieldLabel htmlFor={`${id}-${name}`}>
                    {label}{" "}
                    {name === "contact" ? (
                      <span className="text-muted-foreground font-normal">Opcional</span>
                    ) : (
                      <span className="text-destructive">*</span>
                    )}
                  </FieldLabel>
                  <Input
                    id={`${id}-${name}`}
                    type={type}
                    placeholder={placeholder}
                    {...form.register(name)}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={`${id}-${name}-error`}
                  />
                  <FieldError id={`${id}-${name}-error`} errors={[errors[name]]} />
                </Field>
              ))}
            </div>
            <div>
              <h3 className="mb-3 font-semibold">
                Insumos entregados <span className="text-destructive">*</span>
              </h3>
              {!options.isPending && !options.isError && supplies.length === 0 && (
                <p role="status" className="mb-3 text-sm">
                  No hay insumos en el catálogo. Debes registrar insumos antes de crear una entrega.
                </p>
              )}
              <div className="delivery-repeater">
                <div className="delivery-item-row delivery-item-heading">
                  <span>Insumo</span>
                  <span>Cantidad</span>
                  <span>Unidad</span>
                  <span />
                </div>
                {fields.map((field, index) => {
                  const value = values[index]
                  const variants = supplies.filter((supply) => supply.type === value?.type)
                  const available = (supplyId: string) =>
                    !values.some((item, i) => i !== index && item.supplyId === supplyId)
                  const itemErrors = errors.items?.[index]
                  return (
                    <div key={field.id} className="border-t p-3">
                      <div className="delivery-item-row">
                        <select
                          className="delivery-select"
                          aria-label={`Insumo ${index + 1}`}
                          aria-invalid={Boolean(itemErrors?.type)}
                          aria-describedby={`${id}-item-${index}-error`}
                          value={value?.type ?? ""}
                          onChange={(event) => {
                            const variants = supplies.filter((supply) => supply.type === event.target.value)
                            update(index, {
                              type: event.target.value,
                              supplyId: variants.length === 1 ? variants[0].id : "",
                              quantity: value?.quantity ?? "",
                            })
                          }}
                        >
                          <option value="">Selecciona un insumo…</option>
                          {types.map((type) => (
                            <option
                              key={type}
                              disabled={!supplies.some((supply) => supply.type === type && available(supply.id))}
                            >
                              {type}
                            </option>
                          ))}
                        </select>
                        <Input
                          aria-label={`Cantidad del insumo ${index + 1}`}
                          aria-invalid={Boolean(itemErrors?.quantity)}
                          aria-describedby={`${id}-item-${index}-error`}
                          type="number"
                          min="1"
                          max="2147483647"
                          step="1"
                          placeholder="0"
                          {...form.register(`items.${index}.quantity`)}
                        />
                        <select
                          className="delivery-select"
                          aria-label={`Unidad del insumo ${index + 1}`}
                          aria-invalid={Boolean(itemErrors?.supplyId)}
                          aria-describedby={`${id}-item-${index}-error`}
                          {...form.register(`items.${index}.supplyId`)}
                        >
                          <option value="">Unidad…</option>
                          {variants.map((supply) => (
                            <option key={supply.id} value={supply.id} disabled={!available(supply.id)}>
                              {supply.unit}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar insumo ${index + 1}`}
                          onClick={() => remove(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      <div id={`${id}-item-${index}-error`}>
                        <FieldError errors={[itemErrors?.type, itemErrors?.supplyId, itemErrors?.quantity]} />
                      </div>
                    </div>
                  )
                })}
                <div className="border-t p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ type: "", supplyId: "", quantity: "" })}
                    disabled={fields.length >= supplies.length}
                  >
                    <Plus size={15} /> Agregar insumo
                  </Button>
                  <span className="text-muted-foreground ml-3 text-xs">
                    Puedes agregar varios insumos con sus cantidades.
                  </span>
                </div>
              </div>
              <FieldError errors={[errors.items, errors.items?.root]} />
            </div>
          </fieldset>
          <div className="bg-muted/30 flex flex-wrap items-center justify-end gap-3 border-t px-6 py-4">
            <span className="text-muted-foreground mr-auto text-xs">
              {fields.length} {fields.length === 1 ? "insumo" : "insumos"} en la entrega
            </span>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !options.data || supplies.length === 0}>
              {pending ? "Guardando…" : delivery ? "Guardar cambios" : "Registrar entrega"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
