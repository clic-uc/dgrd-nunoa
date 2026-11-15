"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { useEventTypes } from "@/features/event-types/queries"
import { useEvents } from "../queries"
import { EventEditor } from "./event-editor"
import "@/features/deliveries/components/deliveries.css"
export function EventsView() {
  const [search, setSearch] = useState("")
  const [typeId, setTypeId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [creating, setCreating] = useState(false)
  const valid = !from || !to || from <= to
  const query = useEvents(
    {
      q: useDebouncedValue(search) || undefined,
      typeId: typeId || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    valid,
  )
  const types = useEventTypes()
  return (
    <main className="delivery-page space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/administracion/tipos-evento">Tipos de evento</Link>
          </Button>
          <Button onClick={() => setCreating(true)}>Nuevo evento</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          aria-label="Buscar eventos"
          placeholder="Folio, sector, instituciones, acciones"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="delivery-select"
          aria-label="Tipo de evento"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {types.data?.data.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <label className="text-sm">
          Desde
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          Hasta
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Button
          variant="outline"
          onClick={() => {
            setSearch("")
            setTypeId("")
            setFrom("")
            setTo("")
          }}
        >
          Limpiar filtros
        </Button>
      </div>
      {!valid ? (
        <p role="alert">La fecha hasta no puede ser anterior a desde.</p>
      ) : query.isPending ? (
        <p role="status">Cargando eventos…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : query.data.data.length === 0 ? (
        <p>No hay eventos para estos filtros.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {query.data.data.map((event) => (
            <li key={event.id} className="rounded-xl border p-4">
              <Link href={`/eventos/${event.id}`} className="font-semibold underline">
                {event.folio} · {event.type.name}
              </Link>
              <p className="break-words">{event.sector}</p>
              <p className="text-muted-foreground text-sm">
                {formatDate(event.date)} · {event._count.requests} solicitudes · {event._count.deliveries} entregas
              </p>
            </li>
          ))}
        </ul>
      )}
      {creating && <EventEditor onClose={() => setCreating(false)} />}
    </main>
  )
}
