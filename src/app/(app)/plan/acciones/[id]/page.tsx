import { AccionDetail } from "@/components/views/acciones"

export const metadata = { title: "Acción estratégica · DGRD Ñuñoa" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AccionDetail id={id} />
}
