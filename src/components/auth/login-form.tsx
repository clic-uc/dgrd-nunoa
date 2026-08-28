"use client"

/* ============================================================
   Formulario de inicio de sesión — portado de src/login.jsx.
   Solo correo y contraseña (sin Google, por decisión del spike).
   ============================================================ */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Field, Input, PasswordInput } from "@/components/kit"
import { I } from "@/components/icons"
import { signIn } from "@/lib/auth-client"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error: err } = await signIn.email({ email: email.trim(), password: pass })
    if (err) {
      // Error genérico a propósito: no revelamos qué campo falló ni si la
      // cuenta existe. Better Auth responde 403 cuando la cuenta está baneada.
      setError(
        err.status === 403 && err.code === "BANNED_USER"
          ? "Esta cuenta está desactivada. Contacta a un administrador."
          : "Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.",
      )
      setLoading(false)
      return
    }
    router.replace("/resumen")
    router.refresh()
  }

  return (
    <div className="login-card">
      <h2 style={{ fontSize: 22, margin: "0 0 6px", fontWeight: 600 }}>Iniciar sesión</h2>
      <p className="muted" style={{ margin: "0 0 26px", fontSize: 13.5 }}>
        Ingresa con tu cuenta institucional.
      </p>

      {error && (
        <div className="danger-box" style={{ marginBottom: 18 }}>
          <I.AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={submit}>
        <Field label="Correo electrónico">
          <Input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            placeholder="nombre.apellido@nunoa.cl"
            invalid={!!error}
            required
          />
        </Field>
        <Field label="Contraseña">
          <PasswordInput
            value={pass}
            onChange={(e) => {
              setPass(e.target.value)
              setError("")
            }}
            placeholder="••••••••"
            invalid={!!error}
            autoComplete="current-password"
            required
          />
        </Field>
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={loading}
          style={{ padding: "11px", marginTop: 4 }}
        >
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 26, lineHeight: 1.6 }}>
        Acceso exclusivo para personal autorizado de la Municipalidad de Ñuñoa.
        <br />
        ¿Olvidaste tu contraseña? Solicita a un administrador que la restablezca.
      </p>
    </div>
  )
}
