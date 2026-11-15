import { z } from "zod"
export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Indica el nombre.").max(200),
  email: z.email("El correo no es válido.").trim().toLowerCase(),
  role: z.enum(["admin", "user"]),
  banned: z.boolean(),
  password: z
    .string()
    .max(128, "Máximo 128 caracteres.")
    .refine((v) => !v || v.length >= 12, "La contraseña debe tener al menos 12 caracteres."),
})
export const createUserSchema = userFormSchema.refine((v) => v.password.length >= 12, {
  message: "Indica una contraseña de al menos 12 caracteres.",
  path: ["password"],
})
export type UserInput = z.infer<typeof userFormSchema>
export type ManagedUser = {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  createdAt: string
  historyCount: number
}
