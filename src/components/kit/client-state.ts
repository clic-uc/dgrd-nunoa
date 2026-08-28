"use client"

import { useCallback, useSyncExternalStore } from "react"

/* ============================================================
   Estado que vive fuera de React: montaje en cliente y
   preferencias en localStorage.

   Van con useSyncExternalStore y no con useState+useEffect: leer
   una fuente externa en un efecto provoca un render en cascada y
   un parpadeo del valor por defecto tras la hidratación.
   ============================================================ */

const noopSubscribe = () => () => {}

/** true solo después de hidratar. Necesario antes de usar createPortal. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

/**
 * Preferencia de interfaz persistida en localStorage.
 *
 * En el servidor y en el primer render devuelve `fallback`, así que el HTML
 * hidrata sin discrepancias; el valor guardado aparece en cuanto React se
 * suscribe. Si el storage está bloqueado (modo privado), la preferencia
 * simplemente dura lo que la sesión.
 */
export function usePersistedState<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (localStorage.getItem(key) as T | null) ?? fallback
      } catch {
        return fallback
      }
    },
    () => fallback,
  )

  const set = useCallback(
    (v: T) => {
      try {
        localStorage.setItem(key, v)
      } catch {
        // storage no disponible: se pierde al recargar, no es un error de uso
      }
      listeners.forEach((l) => l())
    },
    [key],
  )

  return [value, set]
}
