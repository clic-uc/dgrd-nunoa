import { createAuthClient } from "better-auth/react"
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"
import type { Auth } from "./auth"

export const authClient = createAuthClient({
  plugins: [
    // Refleja el admin plugin del servidor (gestión de roles, baneos, etc.).
    adminClient(),
    inferAdditionalFields<Auth>(),
  ],
})

export const { signIn, signOut, signUp, useSession } = authClient
