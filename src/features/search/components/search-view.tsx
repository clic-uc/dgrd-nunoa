"use client"
import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/http-client"
import { can } from "@/lib/permissions"
import { useRole } from "@/providers/permissions"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { SEARCH_MODULES, searchSchema, type SearchGroup } from "../schemas"
export function SearchView() {
  const [q, setQ] = useState("")
  const [module, setModule] = useState<keyof typeof SEARCH_MODULES>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const role = useRole()
  const debounced = useDebouncedValue(q)
  const parsed = searchSchema.safeParse({ q: debounced, module, from: from || undefined, to: to || undefined })
  const query = useQuery({
    queryKey: ["search", role, debounced, module, from, to],
    queryFn: () =>
      apiRequest<{ groups: SearchGroup[] }>(
        `/api/search?${new URLSearchParams({ q: debounced, module, ...(from ? { from } : {}), ...(to ? { to } : {}) })}`,
      ),
    enabled: parsed.success,
    staleTime: 0,
  })
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <h1 className="text-2xl font-semibold">Buscar en el sistema</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Búsqueda general"
          placeholder="Beneficiario, dirección, evento, junta, insumo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={200}
        />
        <select
          className="delivery-select"
          aria-label="Módulo de búsqueda"
          value={module}
          onChange={(e) => setModule(e.target.value as typeof module)}
        >
          {Object.entries(SEARCH_MODULES)
            .filter(([key]) => key === "all" || can(role, key as Exclude<keyof typeof SEARCH_MODULES, "all">, "read"))
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
        <label>
          Desde
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          El periodo se aplica a entregas, eventos, solicitudes, actividades y acciones. Hasta 20 resultados por módulo.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setQ("")
            setModule("all")
            setFrom("")
            setTo("")
          }}
        >
          Limpiar filtros
        </Button>
      </div>
      {from && to && from > to ? (
        <p role="alert">La fecha hasta no puede ser anterior a desde.</p>
      ) : q.trim().length < 2 ? (
        <p>Escribe al menos dos caracteres para buscar.</p>
      ) : !parsed.success ? null : query.isPending ? (
        <p role="status">Buscando…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </div>
      ) : query.data && !query.data.groups.some((group) => group.results.length) ? (
        <p>No se encontraron resultados.</p>
      ) : (
        query.data?.groups
          .filter((group) => group.results.length)
          .map((group) => (
            <section key={group.module}>
              <h2 className="mb-3 text-lg font-semibold">{group.label}</h2>
              <ul className="divide-y rounded-xl border">
                {group.results.map((result) => (
                  <li key={result.id} className="p-4">
                    <Link href={result.href} className="font-semibold underline">
                      {result.title}
                    </Link>
                    <p className="text-muted-foreground text-sm break-words">{result.subtitle}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </main>
  )
}
