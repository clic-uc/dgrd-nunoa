import { AppError } from "@/lib/api-error"

export function assertAttended(status: string, response: string | null | undefined, hasDelivery: boolean) {
  if (status === "attended" && !response?.trim() && !hasDelivery) {
    throw new AppError(400, "Una solicitud atendida requiere una respuesta o una entrega vinculada.", {
      fieldErrors: { response: ["Indica la respuesta antes de marcar la solicitud como atendida."] },
    })
  }
}
