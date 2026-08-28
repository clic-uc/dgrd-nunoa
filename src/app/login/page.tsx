import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { I } from "@/components/icons"
import { getSession } from "@/server/session"

export const metadata: Metadata = {
  title: "Iniciar sesión · DGRD Ñuñoa",
  description: "Acceso al sistema interno de la Dirección de Gestión de Riesgo y Desastres de Ñuñoa.",
}

export default async function LoginPage() {
  if (await getSession()) redirect("/resumen")

  return (
    <div className="login-shell">
      {/* Panel institucional */}
      <section className="login-brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG decorativo servido desde /public */}
        <img
          src="/logo-mark-yellow.svg"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", right: -70, top: -60, width: 360, opacity: 0.06, pointerEvents: "none" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG decorativo servido desde /public */}
        <img
          src="/logo-mark-yellow.svg"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", left: -110, bottom: -120, width: 420, opacity: 0.04, pointerEvents: "none" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG servido desde /public */}
        <img
          src="/logo-full-white.svg"
          alt="Municipalidad de Ñuñoa"
          style={{ height: 46, position: "relative", width: "auto" }}
        />

        <div style={{ position: "relative", maxWidth: 440 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(242,183,5,.14)",
              color: "var(--yellow)",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 99,
              marginBottom: 22,
            }}
          >
            <I.ShieldCheck size={14} /> Sistema interno · Acceso restringido
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.18, margin: "0 0 14px", fontWeight: 600, letterSpacing: "-.01em" }}>
            Dirección de Gestión de Riesgo y Desastres
          </h1>
          <p style={{ color: "var(--slate-400)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Registro y seguimiento de solicitudes, eventos de emergencia, entregas de insumos y el Plan de Reducción del
            Riesgo de Desastres de la comuna.
          </p>
        </div>
      </section>

      {/* Panel de formulario */}
      <section className="login-form-pane">
        <LoginForm />
      </section>
    </div>
  )
}
