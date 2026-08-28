import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"
import { nextCookies } from "better-auth/next-js"
import { APIError } from "better-auth/api"
import prisma from "./prisma"

// Vacío o sin definir = sin restricción de dominio. En la rama spike esto
// permite probar con cualquier correo; en producción se fija a "nunoa.cl".
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim() || null

/**
 * Roles del sistema. Solo hay dos y no existe un modelo de permisos granular:
 * los administradores gestionan cuentas y catálogos; todos los demás usuarios
 * comparten los mismos permisos sobre los datos operativos.
 *
 * Se declaran vía access control para que el plugin acepte "regular" — su
 * conjunto por omisión es "user" | "admin".
 */
const ac = createAccessControl(defaultStatements)
const roles = {
  admin: ac.newRole(adminAc.statements),
  regular: ac.newRole({}),
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // Better Auth guarda un único `name`; el sistema muestra nombre y
      // apellido por separado (avatares con iniciales, listados, etc.).
      lastName: { type: "string", required: false, input: true },
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        // Restringe el alta de cuentas al dominio institucional cuando
        // ALLOWED_EMAIL_DOMAIN está definido.
        before: async (user) => {
          if (ALLOWED_DOMAIN && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            throw new APIError("FORBIDDEN", {
              message: `El acceso está restringido a correos institucionales (@${ALLOWED_DOMAIN}).`,
            })
          }
        },
      },
    },
  },
  // nextCookies() debe ir al final: envuelve al resto para poder escribir
  // cookies desde Server Actions.
  plugins: [admin({ ac, roles, defaultRole: "regular", adminRoles: ["admin"] }), nextCookies()],
})

export type Auth = typeof auth
