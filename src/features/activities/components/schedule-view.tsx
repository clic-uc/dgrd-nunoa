"use client"
import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { useStrategicActions } from "@/features/strategic-actions/queries"
import { useActivities } from "../queries"
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]
export function ScheduleView() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const actions = useStrategicActions({ year })
  const activities = useActivities({ from: `${year}-01-01`, to: `${year}-12-31` })
  const pending = actions.isPending || activities.isPending
  const error = actions.error || activities.error
  const agenda = activities.data?.data.filter((activity) => Number(activity.date.slice(5, 7)) === month + 1) ?? []
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Cronograma del Plan RRD</h1>
        <label className="text-sm">
          Año
          <Input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => {
              const value = Number(e.target.value)
              if (value >= 2000 && value <= 2100) setYear(value)
            }}
          />
        </label>
      </div>
      {pending ? (
        <p role="status">Cargando cronograma…</p>
      ) : error ? (
        <div role="alert">
          <p>{error.message}</p>
          <Button
            onClick={() => {
              actions.refetch()
              activities.refetch()
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <section className="overflow-x-auto rounded-xl border" aria-label="Periodos anuales de acciones">
            <div className="min-w-[800px] p-4">
              <div className="grid grid-cols-[240px_repeat(12,1fr)] gap-1 text-center text-xs">
                <strong>Acción</strong>
                {months.map((name) => (
                  <span key={name}>{name.slice(0, 3)}</span>
                ))}
              </div>
              {actions.data?.data.length ? (
                actions.data.data.map((action) => (
                  <div
                    key={action.id}
                    className="mt-3 grid grid-cols-[240px_repeat(12,1fr)] items-center gap-1 text-xs"
                  >
                    <Link className="pr-3 underline" href={`/plan/acciones/${action.id}`}>
                      {action.number}. {action.title}
                    </Link>
                    {months.map((name, index) => {
                      const start = `${year}-${String(index + 1).padStart(2, "0")}-01`
                      const end = new Date(Date.UTC(year, index + 1, 0)).toISOString().slice(0, 10)
                      const active = action.startDate.slice(0, 10) <= end && action.endDate.slice(0, 10) >= start
                      return (
                        <span
                          key={name}
                          aria-label={`${name}: ${active ? "en periodo" : "fuera de periodo"}`}
                          className={`h-5 rounded ${active ? "bg-brand" : "bg-muted"}`}
                        />
                      )
                    })}
                  </div>
                ))
              ) : (
                <p className="py-5">No hay acciones para este año.</p>
              )}
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">Agenda mensual</h2>
              <select
                aria-label="Mes de agenda"
                className="delivery-select w-auto"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {months.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            {agenda.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {agenda.map((activity) => (
                  <li key={activity.id} className="rounded-xl border p-4">
                    <Link href={`/actividades/${activity.id}`} className="font-semibold underline">
                      {formatDate(activity.date)} · {activity.objective}
                    </Link>
                    <p>{activity.location}</p>
                    <Link
                      href={`/plan/acciones/${activity.actionId}`}
                      className="text-muted-foreground text-sm underline"
                    >
                      {activity.action.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay actividades en {months[month].toLowerCase()}.</p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
