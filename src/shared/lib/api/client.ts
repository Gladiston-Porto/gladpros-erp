// Central API client that uses stubs in dev or when NEXT_PUBLIC_USE_STUB=1
import { loginStub, forgotPasswordStub, resetPasswordStub } from "./stubs"

type ApiResult = { ok: boolean; status: number; data?: unknown; error?: string }

const useStub = ((): boolean => {
  try {
    // NEXT_PUBLIC_USE_STUB should be defined in env for client-side usage
    if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_USE_STUB === "1") return true
    // Desativar stubs em desenvolvimento para usar APIs reais
    // if (typeof process !== "undefined" && process.env.NODE_ENV === "development") return true
  } catch {}
  return false
})()

export async function login(payload: { email: string; senha: string }): Promise<ApiResult> {
  if (useStub) {
  const r: { ok: boolean; status: number; data?: unknown; error?: string } = await loginStub(payload)
  return { ok: Boolean(r.ok), status: r.status || 200, data: r.data, error: r.error }
  }
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: payload.email, password: payload.senha }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data, error: data?.error }
}

export async function forgotPassword(payload: { email: string }): Promise<ApiResult> {
  if (useStub) {
  const r: { ok: boolean; status: number; data?: unknown; error?: string } = await forgotPasswordStub(payload)
  return { ok: Boolean(r.ok), status: r.status || 200, error: r.error }
  }
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data, error: data?.error }
}

export async function resetPassword(payload: { token: string; senha: string }): Promise<ApiResult> {
  if (useStub) {
  const r: { ok: boolean; status: number; data?: unknown; error?: string } = await resetPasswordStub(payload)
  return { ok: Boolean(r.ok), status: r.status || 200, error: r.error }
  }
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data, error: data?.error }
}

export const apiClient = { login, forgotPassword, resetPassword }
export default apiClient
