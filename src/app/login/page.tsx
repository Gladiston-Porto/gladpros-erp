"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@gladpros/ui/button"
import { Input } from "@gladpros/ui/input"
import { Eye, EyeOff, Lock, Mail, TrendingUp, ClipboardList, Users } from "lucide-react"
import apiClient from "@/shared/lib/api/client"

// ─── Types ────────────────────────────────────────────────────────────────────
type LoginBlockedData = {
  blocked: boolean
  unlockAt?: string
  requiresPinUnlock?: boolean
  requiresSecurityQuestion?: boolean
}

type LoginMfaData = {
  mfaRequired: boolean
  emailSent?: boolean
  user: { id: number; email: string; nomeCompleto?: string; primeiroAcesso?: boolean }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function isBlockedData(v: unknown): v is LoginBlockedData {
  return (
    isRecord(v) &&
    "blocked" in v &&
    typeof (v as Record<string, unknown>).blocked === "boolean" &&
    Boolean((v as Record<string, unknown>).blocked)
  )
}

function isMfaData(v: unknown): v is LoginMfaData {
  if (!isRecord(v)) return false
  const d = v as Record<string, unknown>
  if (!("mfaRequired" in d) || typeof d.mfaRequired !== "boolean" || !d.mfaRequired) return false
  if (!("user" in d) || !isRecord(d.user)) return false
  const u = d.user as Record<string, unknown>
  return typeof u.id === "number" && typeof u.email === "string"
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<{
    blocked: boolean
    unlockAt?: Date
    requiresPinUnlock?: boolean
    requiresSecurityQuestion?: boolean
  } | null>(null)

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })

        if (active && response.ok) {
          router.replace("/dashboard")
        }
      } catch {
        // Se não houver sessão válida, a página de login continua normalmente.
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [router])

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!blocked?.unlockAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [blocked?.unlockAt])

  const countdown = useMemo(() => {
    if (!blocked?.unlockAt) return null
    const diff = Math.max(0, blocked.unlockAt.getTime() - now)
    const totalSec = Math.ceil(diff / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return { m, s }
  }, [blocked?.unlockAt, now])

  const emailOk = /.+@.+\..+/.test(email)
  const senhaOk = senha.length >= 6
  const canSubmit = emailOk && senhaOk && !loading

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBlocked(null)
    setLoading(true)
    try {
      const res = await apiClient.login({ email: email.trim(), senha })

      if (res.status === 423 && isBlockedData(res.data)) {
        const d = res.data
        setBlocked({
          blocked: true,
          unlockAt: d.unlockAt ? new Date(d.unlockAt) : undefined,
          requiresPinUnlock: d.requiresPinUnlock,
          requiresSecurityQuestion: d.requiresSecurityQuestion,
        })
        setError("Conta temporariamente bloqueada devido a múltiplas tentativas incorretas.")
        return
      }

      if (!res.ok) throw new Error(res.error || "Credenciais inválidas")

      if (
        res.data &&
        typeof res.data === "object" &&
        "success" in res.data &&
        res.data.success &&
        !("mfaRequired" in res.data && res.data.mfaRequired)
      ) {
        setTimeout(() => window.location.replace("/dashboard"), 100)
        return
      }

      if (isMfaData(res.data)) {
        if (
          process.env.NODE_ENV === "development" &&
          process.env.DISABLE_MFA_FOR_TESTS === "true"
        ) {
          router.replace("/dashboard")
          return
        }
        const u = res.data.user
        const params = new URLSearchParams({
          userId: String(u.id),
          email: u.email,
          name: u.nomeCompleto || u.email,
          firstAccess: u.primeiroAcesso ? "true" : "false",
        })
        router.push(`/mfa?${params.toString()}`)
        return
      }

      router.replace("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Hero Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-hero-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Top spacer */}
        <div className="relative z-10" />

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          {/* Branding */}
          <div>
            <Image
              src="/images/LOGO_300.png"
              alt="GladPros"
              width={220}
              height={66}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
              priority
            />
            <p className="mt-3 text-white/75 text-lg font-light tracking-wide">
              Sistema de Gestão Empresarial
            </p>
            <p className="mt-1 text-white/50 text-sm">
              Dallas, Texas · Construção & Serviços
            </p>
          </div>

          {/* Dashboard UI mockup */}
          <div className="w-full rounded-2xl overflow-hidden border border-white/15 bg-black/20 backdrop-blur-md shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-white/5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              <div className="ml-3 h-3 w-28 rounded-full bg-white/15" />
            </div>
            {/* Mockup body */}
            <div className="p-4 space-y-3">
              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Clientes', value: '247', icon: Users, color: 'text-blue-300' },
                  { label: 'OS Ativas', value: '18', icon: ClipboardList, color: 'text-orange-300' },
                  { label: 'Receita', value: '$84k', icon: TrendingUp, color: 'text-emerald-300' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl bg-white/8 border border-white/10 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] text-white/45 uppercase tracking-widest">{label}</span>
                      <Icon className={`h-3 w-3 ${color}`} />
                    </div>
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Table skeleton */}
              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-white/8 bg-white/5">
                  <div className="h-2 w-20 rounded-full bg-white/20" />
                  <div className="h-2 flex-1 rounded-full bg-white/10" />
                  <div className="h-2 w-12 rounded-full bg-white/15" />
                </div>
                {[0.9, 0.6, 0.4].map((opacity, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className={`h-2 w-16 rounded-full bg-white/${Math.round(opacity * 20)}`} />
                    <div className={`h-2 flex-1 rounded-full bg-white/${Math.round(opacity * 12)}`} />
                    <div className={`h-4 w-14 rounded-full bg-white/${Math.round(opacity * 10)}`} />
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-2 w-24 rounded-full bg-white/20" />
                  <div className="h-2 w-8 rounded-full bg-white/30" />
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-blue-400/80 to-cyan-400/60" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} GladPros. Todos os direitos reservados.
        </p>
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-background px-6 py-12 sm:px-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <Image
            src="/images/LOGO_ICONE.png"
            alt="GladPros"
            width={72}
            height={72}
            className="mx-auto rounded-xl mb-3"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o sistema.
            </p>
          </div>

          {/* Error / Block feedback */}
          {(error || blocked?.blocked) && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm"
            >
              {error && (
                <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
              )}
              {blocked?.unlockAt && (
                <p className="text-red-600 dark:text-red-500 text-xs mt-1">
                  Tente novamente em{" "}
                  <strong>
                    {countdown
                      ? `${String(countdown.m).padStart(2, "0")}:${String(countdown.s).padStart(2, "0")}`
                      : "00:00"}
                  </strong>
                </p>
              )}
              {blocked?.blocked && !blocked.unlockAt && (
                <p className="text-red-600 dark:text-red-500 text-xs mt-1">
                  Você já pode tentar novamente.
                </p>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@empresa.com"
                  required
                  aria-describedby={!emailOk && email.length > 0 ? "email-error" : undefined}
                  className="pl-9 h-12 rounded-xl"
                />
              </div>
              {!emailOk && email.length > 0 && (
                <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
                  Informe um e-mail válido.
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="senha"
                  className="block text-sm font-medium text-foreground"
                >
                  Senha
                </label>
                <Link
                  href="/esqueci-senha"
                  className="text-xs text-brand-primary hover:text-brand-primary-dark font-medium transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  aria-describedby={!senhaOk && senha.length > 0 ? "senha-error" : undefined}
                  className="pl-9 pr-11 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {!senhaOk && senha.length > 0 && (
                <p id="senha-error" className="text-xs text-red-600 dark:text-red-400">
                  Mínimo de 6 caracteres.
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              title={!emailOk ? "Informe um e-mail válido" : !senhaOk ? "Informe sua senha (mín. 6 caracteres)" : undefined}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Unlock link */}
          {blocked?.blocked && (blocked.requiresPinUnlock || blocked.requiresSecurityQuestion) && (
            <div className="mt-5 text-center">
              <Link
                href={`/desbloqueio?email=${encodeURIComponent(email)}`}
                className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium transition-colors"
              >
                Desbloquear minha conta →
              </Link>
            </div>
          )}

          {/* Footer note */}
          <p className="mt-10 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} GladPros · Dallas, TX
          </p>
        </div>
      </div>
    </div>
  )
}
