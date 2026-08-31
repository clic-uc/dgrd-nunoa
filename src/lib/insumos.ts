import type { Insumo } from "./types"

/* ============================================================
   Insumos: un mismo `tipo` puede existir con varias unidades
   (Polietileno viene en rollo y en corte, como dos filas de
   `supply` distintas). Agruparlos permite elegirlos en dos pasos
   en vez de mostrar dos opciones con la misma etiqueta.
   ============================================================ */

export type GrupoInsumo = { tipo: string; variantes: Insumo[] }

/** Agrupa por `tipo` preservando el orden de llegada (el servidor los trae `type asc`). */
export function agruparInsumos(insumos: Insumo[]): GrupoInsumo[] {
  const grupos: GrupoInsumo[] = []
  for (const i of insumos) {
    const g = grupos.find((x) => x.tipo === i.tipo)
    if (g) g.variantes.push(i)
    else grupos.push({ tipo: i.tipo, variantes: [i] })
  }
  return grupos
}

/** Etiqueta sin ambigüedad: agrega la unidad solo cuando el tipo se repite. */
export function etiquetaInsumo(insumo: Insumo, insumos: Insumo[]): string {
  const ambiguo = insumos.some((x) => x.id !== insumo.id && x.tipo === insumo.tipo)
  return ambiguo ? `${insumo.tipo} · ${insumo.unidad}` : insumo.tipo
}
