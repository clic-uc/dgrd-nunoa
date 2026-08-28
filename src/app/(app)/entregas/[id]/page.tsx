import { EntregaDetail } from "@/components/views/entregas"

export const metadata = { title: "Entrega · DGRD Ñuñoa" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EntregaDetail id={id} />
}
