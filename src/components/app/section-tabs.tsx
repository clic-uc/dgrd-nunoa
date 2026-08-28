"use client"

import { I } from "@/components/icons"
import { useApp, type RouteName } from "./provider"

/* Sub-pestañas operativo ↔ catálogo (portado de src/ui.jsx). */
const SECTION_TABS: Record<string, { key: RouteName; label: string; Icon: typeof I.Truck }[]> = {
  ayudas: [
    { key: "entregas", label: "Entregas", Icon: I.Truck },
    { key: "insumos", label: "Insumos", Icon: I.Box },
  ],
  plan: [
    { key: "cronograma", label: "Cronograma", Icon: I.Calendar },
    { key: "acciones", label: "Acciones estratégicas", Icon: I.Target },
  ],
}

export function SectionTabs({ group, active }: { group: "ayudas" | "plan"; active: RouteName }) {
  const app = useApp()
  const items = SECTION_TABS[group] ?? []
  return (
    <div className="section-tabs-wrap">
      <div className="seg" role="tablist">
        {items.map(({ key, label, Icon }) => {
          const on = active === key
          return (
            <button
              key={key}
              role="tab"
              aria-selected={on}
              className={on ? "on" : ""}
              onClick={() => {
                if (!on) app.nav({ name: key })
              }}
            >
              <Icon size={14} /> {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
