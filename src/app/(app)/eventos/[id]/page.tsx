import { EventoDetail } from "@/components/views/eventos"

export const metadata = { title: "Evento · DGRD Ñuñoa" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EventoDetail id={id} />
}
