"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { rutSchema } from "@/lib/rut"
import { formatDate } from "@/lib/format"
import { useRecurrence } from "../queries"
import { recurrenceQuerySchema } from "../schemas"
export function RecurrenceAlert({ rut, date, excludeId }: { rut: string; date: string; excludeId?: string }) {
  const debounced = useDebouncedValue(rut)
  const parsed = rutSchema.safeParse(debounced)
  const valid = parsed.success && recurrenceQuerySchema.safeParse({ rut: debounced, date, excludeId }).success
  const query = useRecurrence({ rut: parsed.success ? parsed.data : "", date, excludeId }, valid)
  if (!valid || debounced !== rut) return null
  if (query.isPending) return <p role="status">Consultando entregas anteriores…</p>
  if (query.isError)
    return (
      <div role="alert" className="rounded-lg border p-3">
        <p>No se pudo consultar el historial. Esto no impide guardar la entrega.</p>
        <Button type="button" variant="outline" onClick={() => query.refetch()}>
          Reintentar consulta
        </Button>
      </div>
    )
  if (!query.data.deliveries.length)
    return (
      <p className="text-muted-foreground text-sm">
        Sin entregas registradas para este RUT en los seis meses anteriores.
      </p>
    )
  return (
    <section
      aria-label="Entregas anteriores del beneficiario"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <h3 className="font-semibold">Este beneficiario ya recibió insumos en los últimos seis meses</h3>
      <p className="text-sm">
        Del {formatDate(query.data.from)} al {formatDate(query.data.to)}. Aviso informativo: puedes continuar.
      </p>
      <ul className="mt-3 space-y-3">
        {query.data.deliveries.map((delivery) => (
          <li key={delivery.id}>
            <Link className="underline" href={`/entregas/${delivery.id}`} target="_blank" rel="noopener noreferrer">
              {delivery.folio} · {formatDate(delivery.date)}
            </Link>
            <ul>
              {delivery.items.map((item, index) => (
                <li key={index}>
                  {item.supply.type}: {item.quantity} {item.supply.unit}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
