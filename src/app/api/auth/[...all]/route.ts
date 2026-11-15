import { toErrorResponse } from "@/lib/api-error"
import { withAudit } from "@/lib/audit"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"
const handlers = toNextJsHandler(auth)
/** Administrative writes must use /api/users, which preserves history and active administrators. */
export async function POST(request: Request) {
  let path: string
  try {
    path = decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g, "/")
  } catch {
    return NextResponse.json({ message: "Ruta no válida." }, { status: 400 })
  }
  if (path.startsWith("/api/auth/admin/"))
    return NextResponse.json({ message: "Usa la administración de usuarios del sistema." }, { status: 403 })
  if (
    ["/api/auth/update-user", "/api/auth/change-email", "/api/auth/change-password", "/api/auth/set-password"].includes(
      path,
    )
  ) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (session) {
      try {
        return await withAudit(session.user.id, async () => {
          const response = await handlers.POST(request)
          if (!response.ok) throw response
          if (response.ok && (path.endsWith("/change-password") || path.endsWith("/set-password")))
            await prisma.auditLog.create({
              data: {
                actorId: session.user.id,
                actorName: session.user.name,
                entity: "user",
                recordId: session.user.id,
                operation: "PASSWORD_CHANGED",
              },
            })
          return response
        })
      } catch (error) {
        return error instanceof Response ? error : toErrorResponse(error)
      }
    }
  }
  return handlers.POST(request)
}
export const GET = handlers.GET
