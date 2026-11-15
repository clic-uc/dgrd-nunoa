import type { Prisma } from "@/generated/prisma/client"

/** Reserve inside the business transaction; deleting a record never releases its number. */
export async function reserveFolio(tx: Prisma.TransactionClient, kind: "ENT" | "SOL" | "EVT", year: number) {
  const [counter] = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO folio_counter (kind, year, value) VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET value = folio_counter.value + 1
    RETURNING value`
  return `${kind}-${year}-${String(counter.value).padStart(3, "0")}`
}
