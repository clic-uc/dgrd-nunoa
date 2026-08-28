import { SolicitudDetail } from "@/components/views/solicitudes"

export const metadata = { title: "Solicitud · DGRD Ñuñoa" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SolicitudDetail id={id} />
}
