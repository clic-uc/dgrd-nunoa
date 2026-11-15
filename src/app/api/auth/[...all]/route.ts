import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"
const handlers = toNextJsHandler(auth)
/** Administrative writes must use /api/users, which preserves history and active administrators. */
export async function POST(request: Request) {
  if (decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g, "/").startsWith("/api/auth/admin/"))
    return NextResponse.json({ message: "Usa la administración de usuarios del sistema." }, { status: 403 })
  return handlers.POST(request)
}
export const GET = handlers.GET
