import { z } from "zod"
export function normalizeRut(value: string) {
  return value
    .replace(/[.\s]/g, "")
    .toUpperCase()
    .replace(/^([0-9]{7,8})([0-9K])$/, "$1-$2")
}
export function isValidRut(value: string) {
  const rut = normalizeRut(value)
  if (!/^[1-9][0-9]{6,7}-[0-9K]$/.test(rut)) return false
  const [body, verifier] = rut.split("-")
  let sum = 0
  let factor = 2
  for (const digit of [...body].reverse()) {
    sum += Number(digit) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const remainder = 11 - (sum % 11)
  return verifier === (remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder))
}
export const rutSchema = z
  .string()
  .trim()
  .refine(isValidRut, "Indica un RUT válido con dígito verificador.")
  .transform(normalizeRut)
