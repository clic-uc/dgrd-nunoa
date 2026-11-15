"use client"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { ApiError } from "@/features/deliveries/api"
import { useUsers, useSaveUser, useDeleteUser } from "../queries"
import { userFormSchema, createUserSchema, type ManagedUser, type UserInput } from "../schemas"
function Editor({ record, actorId, onClose }: { record?: ManagedUser; actorId: string; onClose: () => void }) {
  const id = useId()
  const form = useForm<UserInput>({
    resolver: zodResolver(record ? userFormSchema : createUserSchema),
    defaultValues: {
      name: record?.name ?? "",
      email: record?.email ?? "",
      role: record?.role === "admin" ? "admin" : "user",
      banned: record?.banned ?? false,
      password: "",
    },
  })
  const save = useSaveUser()
  const own = record?.id === actorId
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (save.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (save.isPending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{record ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
          <DialogDescription>
            Solo correos institucionales. Cambiar correo, rol, activación o contraseña revoca las sesiones existentes.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({ ...values, id: record?.id })
              toast.success("Cuenta guardada.")
              onClose()
              if (own && (values.password || values.email !== record?.email)) window.location.assign("/login")
            } catch (e) {
              if (e instanceof ApiError && e.fieldErrors)
                for (const [key, messages] of Object.entries(e.fieldErrors))
                  if (key in values && messages?.[0]) form.setError(key as keyof UserInput, { message: messages[0] })
              toast.error(e instanceof Error ? e.message : "No se pudo guardar.")
            }
          })}
        >
          <fieldset className="space-y-4" disabled={save.isPending}>
            {(
              [
                ["name", "Nombre", "text"],
                ["email", "Correo institucional", "email"],
                [
                  "password",
                  record ? "Nueva contraseña (dejar vacía para conservar)" : "Contraseña inicial",
                  "password",
                ],
              ] as const
            ).map(([name, label, type]) => (
              <Field key={name}>
                <FieldLabel htmlFor={`${id}-${name}`}>{label}</FieldLabel>
                <Input
                  id={`${id}-${name}`}
                  type={type}
                  autoComplete={name === "password" ? "new-password" : "off"}
                  {...form.register(name)}
                  aria-invalid={Boolean(form.formState.errors[name])}
                  aria-describedby={`${id}-${name}-error`}
                />
                <FieldError id={`${id}-${name}-error`} errors={[form.formState.errors[name]]} />
              </Field>
            ))}
            <Field>
              <FieldLabel htmlFor={`${id}-role`}>Rol</FieldLabel>
              <select id={`${id}-role`} className="delivery-select" disabled={own} {...form.register("role")}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={own} {...form.register("banned")} />
              Cuenta desactivada
            </label>
            {own && <p className="text-muted-foreground text-sm">Tu rol y activación están protegidos.</p>}
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export function UsersView({ actorId }: { actorId: string }) {
  const [q, setQ] = useState("")
  const query = useUsers(useDebouncedValue(q))
  const [editing, setEditing] = useState<{ record?: ManagedUser } | null>(null)
  const [deleting, setDeleting] = useState<ManagedUser | null>(null)
  const remove = useDeleteUser()
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={() => setEditing({})}>Nueva cuenta</Button>
      </div>
      <Input
        aria-label="Buscar usuarios"
        placeholder="Nombre o correo"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {query.isPending ? (
        <p role="status">Cargando cuentas…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </div>
      ) : !query.data.data.length ? (
        <p>No hay cuentas para esta búsqueda.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {query.data.data.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <strong>{user.name}</strong>
                <p className="text-sm break-all">{user.email}</p>
                <p className="text-muted-foreground text-sm">
                  {user.role === "admin" ? "Administrador" : "Usuario"} · {user.banned ? "Desactivado" : "Activo"} ·{" "}
                  {user.historyCount} registros
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing({ record: user })}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  disabled={user.id === actorId || user.historyCount > 0}
                  onClick={() => setDeleting(user)}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <Editor actorId={actorId} record={editing.record} onClose={() => setEditing(null)} />}
      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cuenta de {deleting.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Solo pueden eliminarse cuentas sin historial. Esta acción revoca sus sesiones y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending}
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    await remove.mutateAsync(deleting.id)
                    setDeleting(null)
                    toast.success("Cuenta eliminada.")
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo eliminar.")
                  }
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  )
}
