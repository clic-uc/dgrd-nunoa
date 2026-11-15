/** Inclusive calendar-month interval, clamping the day to the last valid day. */
export function recurrencePeriod(day: string) {
  const end = new Date(`${day}T00:00:00.000Z`)
  const start = new Date(end)
  start.setUTCDate(1)
  start.setUTCMonth(start.getUTCMonth() - 6)
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  start.setUTCDate(Math.min(end.getUTCDate(), lastDay))
  return { start, end }
}
