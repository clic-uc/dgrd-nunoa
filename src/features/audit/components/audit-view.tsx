"use client"
import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/http-client"
import { formatDateTime } from "@/lib/format"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { AUDIT_ENTITIES, type AuditRecord } from "../schemas"
const operations: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Eliminación",
  PASSWORD_RESET: "Contraseña restablecida",
  PASSWORD_CHANGED: "Contraseña cambiada",
}
export function AuditView() {
  const [entity, setEntity] = useState("")
  const [actor, setActor] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const debounced = useDebouncedValue(actor)
  const valid = !from || !to || from <= to
  const query = useInfiniteQuery({
    queryKey: ["audit", entity, debounced, from, to],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiRequest<{ data: AuditRecord[]; nextCursor: string | null }>(
        `/api/audit?${new URLSearchParams({ ...(entity ? { entity } : {}), ...(debounced ? { actor: debounced } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(pageParam ? { cursor: pageParam } : {}) })}`,
      ),
    getNextPageParam: (page) => page.nextCursor,
    enabled: valid,
    staleTime: 0,
  })
  const rows = query.data?.pages.flatMap((page) => page.data) ?? []
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-5 sm:p-8">
      <h1 className="text-2xl font-semibold">Auditoría</h1>
      <p className="text-muted-foreground text-sm">
        Historial de cambios. Las operaciones externas a la aplicación se identifican sin atribuirlas a un usuario.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          aria-label="Entidad"
          className="delivery-select"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">Todas las entidades</option>
          {AUDIT_ENTITIES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <Input
          aria-label="Ejecutor"
          placeholder="Nombre o identificador del ejecutor"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          maxLength={200}
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
            setEntity("")
            setActor("")
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
        <p role="status">Cargando historial…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </div>
      ) : !rows.length ? (
        <p>No hay cambios para estos filtros.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border p-4">
                <p className="font-semibold">
                  {operations[row.operation] ?? row.operation} · {row.entity}
                </p>
                <p className="text-muted-foreground text-sm break-all">
                  {formatDateTime(row.createdAt)} · {row.actorName ?? "Sistema / SQL externo"} · Registro {row.recordId}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer underline">Ver cambios</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <h2 className="font-medium">Antes</h2>
                      <pre className="bg-muted max-h-80 overflow-auto rounded p-3 text-xs">
                        {JSON.stringify(row.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h2 className="font-medium">Después</h2>
                      <pre className="bg-muted max-h-80 overflow-auto rounded p-3 text-xs">
                        {JSON.stringify(row.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              {query.isFetchingNextPage ? "Cargando…" : "Cargar anteriores"}
            </Button>
          )}
        </>
      )}
    </main>
  )
}
