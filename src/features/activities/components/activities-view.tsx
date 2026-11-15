"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { useActivities } from "../queries"
export function ActivitiesView() {
  const [q, setQ] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const valid = !from || !to || from <= to
  const query = useActivities(
    { q: useDebouncedValue(q) || undefined, from: from || undefined, to: to || undefined },
    valid,
  )
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-8">
      <h1 className="text-2xl font-semibold">Actividades</h1>
      <p>
        Para registrar una actividad, abre su{" "}
        <Link className="underline" href="/plan/acciones">
          acción estratégica
        </Link>
        .
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          aria-label="Buscar actividades"
          placeholder="Objetivo, dirección o participantes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label>
          Desde
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Button
          variant="outline"
          onClick={() => {
            setQ("")
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
        <p role="status">Cargando actividades…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </div>
      ) : !query.data.data.length ? (
        <p>No hay actividades para estos filtros.</p>
      ) : (
        <ul className="space-y-3">
          {query.data.data.map((activity) => (
            <li key={activity.id} className="rounded-xl border p-4">
              <Link href={`/actividades/${activity.id}`} className="font-semibold underline">
                {activity.objective}
              </Link>
              <p>
                {formatDate(activity.date)} · {activity.location}
              </p>
              <Link href={`/plan/acciones/${activity.actionId}`} className="text-muted-foreground text-sm underline">
                {activity.action.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
