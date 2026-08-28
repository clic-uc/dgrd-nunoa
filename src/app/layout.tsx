import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { Providers } from "@/providers"
import "./globals.css"
import "./dgrd.css"

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "DGRD Ñuñoa",
  description: "Dirección de Gestión de Riesgo y Desastres, Municipalidad de Ñuñoa",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}>
      {/* `dgrd` aporta los tokens y la base tipográfica del sistema; al estar en
          body, los portales (modales, drawer, toasts) también los heredan. */}
      <body className="dgrd">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
