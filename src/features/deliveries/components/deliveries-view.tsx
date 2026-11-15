"use client"
import { useState, useRef } from "react"
import Link from "next/link"
import { CalendarDays, Eye, Filter, Pencil, Plus, Search, Trash2, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AidTabs } from "@/components/layout/aid-tabs"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { useDeliveries, useDeliveryOptions } from "../queries"
import type { Delivery, ListDeliveriesQuery } from "../schemas"
import { DeliveryDetailView } from "./delivery-detail-view"
import { DeliveryFormDialog } from "./delivery-form-dialog"
import { DeleteDeliveryDialog } from "./delete-delivery-dialog"
import "./deliveries.css"

function day(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
function period(key: "month" | "30" | "year"): [string, string] {
  const now = new Date(),
    start = new Date(now)
  if (key === "month") start.setDate(1)
  if (key === "30") start.setDate(start.getDate() - 29)
  if (key === "year") {
    start.setMonth(0)
    start.setDate(1)
  }
  return [day(start), day(now)]
}
export function DeliveriesView() {
  const [search, setSearch] = useState("")
  const [beneficiary, setBeneficiary] = useState("")
  const [eventId, setEventId] = useState("")
  const debouncedBeneficiary = useDebouncedValue(beneficiary)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [event, setEvent] = useState<NonNullable<ListDeliveriesQuery["event"]>>("all")
  const [supplyId, setSupplyId] = useState("")
  const [neighborhoodAssociationId, setNeighborhoodAssociationId] = useState("")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [advanced, setAdvanced] = useState(false)
  const [form, setForm] = useState<{ delivery?: Delivery } | null>(null)
  const [deleting, setDeleting] = useState<Delivery | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const focusReturn = useRef<HTMLElement | null>(null)
  const q = useDebouncedValue(search)
  const validPeriod = !from || !to || from <= to
  const query = useDeliveries(
    {
      q: q || undefined,
      beneficiary: debouncedBeneficiary || undefined,
      eventId: eventId || undefined,
      from: from || undefined,
      to: to || undefined,
      event,
      supplyId: supplyId || undefined,
      neighborhoodAssociationId: neighborhoodAssociationId || undefined,
      order,
    },
    { enabled: validPeriod },
  )
  const options = useDeliveryOptions()
  const advancedCount =
    Number(Boolean(beneficiary)) +
    Number(Boolean(eventId)) +
    Number(event !== "all") +
    Number(Boolean(supplyId)) +
    Number(Boolean(neighborhoodAssociationId)) +
    Number(order !== "desc")
  const hasFilters = Boolean(search || from || to || advancedCount)
  const rows = validPeriod ? (query.data?.data ?? []) : []
  function clear() {
    setSearch("")
    setBeneficiary("")
    setEventId("")
    setFrom("")
    setTo("")
    setEvent("all")
    setSupplyId("")
    setNeighborhoodAssociationId("")
    setOrder("desc")
  }
  function openDetail(id: string, element: HTMLElement) {
    focusReturn.current = element
    setDetailId(id)
  }
  return (
    <div className="deliveries delivery-page">
      <AidTabs active="deliveries" />
      <div className="delivery-page-head">
        <div>
          <h1>Entregas</h1>
          <p>Todas las entregas de insumos registradas. Acota por periodo y afina con filtros avanzados.</p>
        </div>
        <Button onClick={() => setForm({})}>
          <Plus size={16} />
          Registrar entrega
        </Button>
      </div>
      <div className="delivery-toolbar">
        <div className="delivery-period">
          <CalendarDays aria-hidden="true" size={15} />
          <input
            aria-label="Desde"
            aria-invalid={!validPeriod}
            aria-describedby={!validPeriod ? "delivery-period-error" : undefined}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>→</span>
          <input
            aria-label="Hasta"
            aria-invalid={!validPeriod}
            aria-describedby={!validPeriod ? "delivery-period-error" : undefined}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
          {(from || to) && (
            <button
              type="button"
              aria-label="Limpiar periodo"
              onClick={() => {
                setFrom("")
                setTo("")
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="delivery-presets">
          {(
            [
              ["month", "Este mes"],
              ["30", "30 días"],
              ["year", "Este año"],
            ] as const
          ).map(([key, label]) => {
            const dates = period(key)
            const active = from === dates[0] && to === dates[1]
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFrom(dates[0])
                  setTo(dates[1])
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            aria-expanded={advanced}
            aria-controls="delivery-filters"
            onClick={() => setAdvanced(!advanced)}
          >
            <Filter size={16} />
            Filtros{advancedCount > 0 && <span className="delivery-count">{advancedCount}</span>}
          </Button>
        </div>
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            className="w-full pl-9 sm:w-[280px]"
            placeholder="Buscar por folio, beneficiario o J.V.…"
            aria-label="Buscar entregas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {!validPeriod && (
        <p id="delivery-period-error" role="alert" className="text-destructive mb-3 text-sm">
          La fecha hasta no puede ser anterior a desde.
        </p>
      )}
      {advanced && (
        <div id="delivery-filters" className="delivery-filter-panel">
          <label>
            Beneficiario
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="Nombre del beneficiario"
            />
          </label>
          <label>
            Evento específico
            <select className="delivery-select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Cualquier evento</option>
              {options.data?.events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.folio} · {event.sector}
                </option>
              ))}
            </select>
          </label>

          <label>
            Junta vecinal
            <select
              className="delivery-select"
              aria-label="Filtrar por junta vecinal"
              value={neighborhoodAssociationId}
              onChange={(event) => setNeighborhoodAssociationId(event.target.value)}
            >
              <option value="">Todas las juntas</option>
              {options.data?.neighborhoodAssociations.map((association) => (
                <option key={association.id} value={association.id}>
                  N°{association.number} · {association.name}
                  {association.active ? "" : " (inactiva)"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evento
            <select
              className="delivery-select"
              aria-label="Evento"
              value={event}
              onChange={(e) => setEvent(e.target.value as typeof event)}
            >
              <option value="all">Todas las entregas</option>
              <option value="with">Con evento</option>
              <option value="without">Sin evento</option>
            </select>
          </label>
          <label>
            Insumo incluido
            <select
              className="delivery-select"
              aria-label="Insumo incluido"
              value={supplyId}
              onChange={(e) => setSupplyId(e.target.value)}
            >
              <option value="">Cualquier insumo</option>
              {options.data?.supplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.type} · {supply.unit}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordenar por fecha
            <select
              className="delivery-select"
              aria-label="Ordenar por fecha"
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguas primero</option>
            </select>
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setEvent("all")
              setSupplyId("")
              setNeighborhoodAssociationId("")
              setOrder("desc")
            }}
          >
            Limpiar filtros
          </Button>
          {options.isError && (
            <Button variant="outline" onClick={() => options.refetch()}>
              Reintentar carga de insumos
            </Button>
          )}
        </div>
      )}
      <div className="delivery-stats" aria-busy={validPeriod && query.isFetching}>
        {[
          [query.data?.stats.deliveries, `Entregas${from || to ? " en el periodo" : ""}`],
          [query.data?.stats.units, "Unidades distribuidas"],
          [query.data?.stats.neighborhoods, "Juntas vecinales"],
        ].map(([value, label]) => (
          <div key={String(label)}>
            <strong>{!validPeriod || query.isError ? "—" : (value ?? "—")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="delivery-panel" aria-busy={validPeriod && query.isFetching}>
        {!validPeriod ? (
          <div className="delivery-empty">
            <CalendarDays size={28} aria-hidden="true" />
            <h2>Corrige el rango de fechas</h2>
            <p>El listado y los indicadores se mostrarán cuando el periodo sea válido.</p>
          </div>
        ) : query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudo cargar el listado</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando entregas">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="delivery-empty">
            <Truck size={28} />
            <h2>No hay entregas</h2>
            <p>
              {hasFilters
                ? "No se encontraron entregas con los filtros aplicados."
                : "Aún no se han registrado entregas de insumos."}
            </p>
            <Button variant="outline" onClick={() => (hasFilters ? clear() : setForm({}))}>
              {hasFilters ? "Limpiar filtros" : "Registrar entrega"}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Beneficiario</th>
                  <th>Junta vecinal</th>
                  <th>Evento</th>
                  <th className="text-right">Insumos</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      const button = e.currentTarget.querySelector<HTMLButtonElement>("button")
                      if (button) openDetail(delivery.id, button)
                    }}
                  >
                    <td>
                      <Link
                        href={`/entregas/${delivery.id}`}
                        onClick={(e) => {
                          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            openDetail(delivery.id, e.currentTarget)
                          }
                        }}
                        className="font-mono font-semibold hover:underline"
                      >
                        {delivery.folio}
                      </Link>
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">{formatDate(delivery.date)}</td>
                    <td className="font-semibold">{delivery.beneficiary}</td>
                    <td>
                      <Link
                        href={`/juntas-vecinales/${delivery.neighborhoodAssociationId}`}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:underline"
                      >
                        N°{delivery.neighborhoodAssociation.number} · {delivery.neighborhoodAssociation.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`delivery-badge ${delivery.event ? "delivery-badge-event" : ""}`}>
                        {delivery.event?.folio ?? "Sin evento"}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="delivery-count mr-2">{delivery.items.length}</span>
                      <span className="font-mono">
                        {delivery.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        <span className="text-muted-foreground text-xs">uds</span>
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ver ${delivery.folio}`}
                          onClick={(e) => openDetail(delivery.id, e.currentTarget)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${delivery.folio}`}
                          onClick={() => setForm({ delivery })}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Eliminar ${delivery.folio}`}
                          onClick={() => setDeleting(delivery)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {form && (
        <DeliveryFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          delivery={form.delivery}
        />
      )}
      <DeleteDeliveryDialog delivery={deleting} onClose={() => setDeleting(null)} />
      <Dialog
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      >
        <DialogContent
          className="top-0 right-0 left-auto block h-svh max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none p-0 sm:max-w-[900px]"
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            focusReturn.current?.focus()
          }}
        >
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>Entrega</DialogTitle>
            <DialogDescription>Datos del beneficiario, insumos y registro de la entrega.</DialogDescription>
          </DialogHeader>
          {detailId && <DeliveryDetailView id={detailId} embedded onDeleted={() => setDetailId(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
