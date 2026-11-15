"use client"

import { ActivityEditor } from "@/features/activities/components/activity-editor"
import { usePermission } from "@/providers/permissions"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity as ActivityIcon,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react"
import { AppTopbar } from "@/components/layout/app-topbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { durationInDays, formatDate } from "@/lib/format"
import type { StrategicActionActivity, StrategicActionDetail } from "../schemas"
import { useStrategicAction } from "../queries"
import { DeleteActionDialog, type DeletableAction } from "./delete-action-dialog"
import { StrategicActionFormDialog } from "./strategic-action-form-dialog"

type Props = {
  id: string
  user?: { name: string; email: string } | null
}

export function StrategicActionDetailView({ id, user }: Props) {
  const canManage = usePermission("strategic-actions", "update")
  const router = useRouter()
  const { data: action, isPending, isError, error } = useStrategicAction(id)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DeletableAction | null>(null)

  const crumbLabel = action ? `N°${action.number} · ${action.year}` : "Acción"

  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Plan RRD" }, { label: "Acciones estratégicas" }, { label: crumbLabel, current: true }]}
        user={user}
      />

      <div className="mx-auto flex w-full max-w-[1200px] flex-col px-5 py-6 sm:px-7">
        <Link
          href="/plan/acciones"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-[13px] focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Acciones estratégicas
        </Link>

        {isError ? (
          <p className="text-muted-foreground mt-10 text-[14px]">
            {error instanceof Error ? error.message : "No se pudo cargar la acción."}
          </p>
        ) : isPending ? (
          <DetailSkeleton />
        ) : (
          <>
            <Header
              action={action}
              onEdit={() => setIsFormOpen(true)}
              onDelete={() =>
                setPendingDelete({
                  id: action.id,
                  number: action.number,
                  year: action.year,
                  title: action.title,
                  activityCount: action._count.activities,
                })
              }
            />

            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
              <ActivitiesCard activities={action.activities} action={action} />
              <InfoCard action={action} />
            </div>

            {canManage && (
              <>
                <StrategicActionFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} action={action} />
                <DeleteActionDialog
                  action={pendingDelete}
                  onOpenChange={(open) => !open && setPendingDelete(null)}
                  onDeleted={() => router.push("/plan/acciones")}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

function Header({
  action,
  onEdit,
  onDelete,
}: {
  action: StrategicActionDetail
  onEdit: () => void
  onDelete: () => void
}) {
  const canManage = usePermission("strategic-actions", "update")
  return (
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-muted-foreground flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
          Acción N°{action.number}
          <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 tracking-normal">
            {action.year}
          </span>
        </p>

        <h1 className="mt-2 max-w-[760px] text-[26px] leading-[1.2] font-semibold tracking-tight">{action.title}</h1>

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-[13px]">
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4" />
            <span className="font-mono text-[12.5px]">
              {formatDate(action.startDate)} – {formatDate(action.endDate)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {pluralizeDays(durationInDays(action.startDate, action.endDate))}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canManage && (
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Eliminar acción"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function pluralizeDays(days: number) {
  return days === 1 ? "1 día" : `${days} días`
}

function ActivitiesCard({
  activities,
  action,
}: {
  activities: StrategicActionActivity[]
  action: StrategicActionDetail
}) {
  const [creating, setCreating] = useState(false)
  const canCreate = usePermission("activities", "create")
  return (
    <section className="bg-surface rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <ActivityIcon aria-hidden="true" className="text-muted-foreground size-4" />
          Actividades
          <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums">
            {activities.length}
          </span>
        </h2>

        {canCreate && (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nueva actividad
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-muted-foreground px-5 py-10 text-center text-[13.5px]">
          Esta acción todavía no tiene actividades registradas.
        </p>
      ) : (
        <ul className="divide-y">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-center gap-3.5 px-5 py-3.5 text-left">
              <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <ActivityIcon aria-hidden="true" className="text-muted-foreground size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/actividades/${activity.id}`}
                  className="block truncate text-[13.5px] font-medium underline"
                >
                  {activity.objective}
                </Link>
                <p className="text-muted-foreground mt-1 flex items-center gap-2 text-[12px]">
                  <span className="shrink-0 font-mono whitespace-nowrap">{formatDate(activity.date)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{activity.location}</span>
                  </span>
                </p>
              </div>

              <span
                className={
                  activity._count.evidence > 0
                    ? "bg-brand-soft text-brand-ink shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                    : "bg-secondary text-muted-foreground shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                }
              >
                {activity._count.evidence > 0
                  ? `${activity._count.evidence} ${activity._count.evidence === 1 ? "evidencia" : "evidencias"}`
                  : "Sin evidencia"}
              </span>

              <ChevronRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
            </li>
          ))}
        </ul>
      )}
      {creating && <ActivityEditor action={action} onClose={() => setCreating(false)} />}
    </section>
  )
}

function InfoCard({ action }: { action: StrategicActionDetail }) {
  const rows = [
    { label: "N° de acción", value: String(action.number) },
    { label: "Año", value: String(action.year) },
    { label: "Fecha de inicio", value: formatDate(action.startDate), mono: true },
    { label: "Fecha de término", value: formatDate(action.endDate), mono: true },
    { label: "Cómo desarrollarla", value: action.implementation },
    { label: "Temas", value: action.topics },
  ]

  return (
    <section className="bg-surface rounded-xl border">
      <h2 className="flex items-center gap-2 border-b px-5 py-4 text-[15px] font-semibold">
        <Target aria-hidden="true" className="text-muted-foreground size-4" />
        Información de la acción
      </h2>

      <dl className="flex flex-col gap-5 px-5 py-5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">{row.label}</dt>
            <dd
              className={row.mono ? "mt-1 font-mono text-[13px]" : "mt-1 text-[13.5px] leading-relaxed wrap-anywhere"}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6" aria-busy="true" aria-label="Cargando acción">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-[520px] max-w-full" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  )
}
