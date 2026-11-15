import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { searchSchema } from "@/features/search/schemas"
import { searchRecords } from "@/features/search/service"
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    return NextResponse.json(
      await searchRecords(searchSchema.parse(Object.fromEntries(request.nextUrl.searchParams)), user.role),
    )
  } catch (e) {
    return toErrorResponse(e)
  }
}
