"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { AuthInput } from "@gladpros/ui/auth-input";
import apiClient from "@/shared/lib/api/client"

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    
    try {
      const res = await apiClient.forgotPassword({ email: email.trim() })
      if (!res.ok) throw new Error(res.error || "Falha ao solicitar redefinição")
      
      setMsg({ 
        t: "ok", 
        m: "Se o e-mail existir, enviaremos um link para redefinir a senha." 
      })
      
      // Em dev, mostrar link apenas no console (não na UI por segurança)
      if (process.env.NODE_ENV === 'development' && typeof res.data === 'object' && res.data !== null && 'resetUrl' in (res.data as Record<string, unknown>)) {
        const url = (res.data as { resetUrl?: string }).resetUrl
        if (url) {
          console.warn('[DEV] Link de redefinição gerado:', url)
          setMsg({ 
            t: "ok", 
            m: "E-mail enviado! Em modo de desenvolvimento, verifique o console do navegador para o link de teste." 
          })
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro inesperado"
      setMsg({ t: "err", m: message })
    } finally {
      setLoading(false)
    }
  }

  const emailOk = /.+@.+\..+/.test(email)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
          {/* Header com Logo */}
          <div className="text-center mb-8">
            <Image 
              src="/images/LOGO_300.png" 
              alt="GladPros" 
              width={80} 
              height={80} 
              className="mx-auto mb-4 rounded-xl"
              style={{ height: 'auto' }}
            />
            <h1 className="text-2xl font-bold text-foreground">Esqueceu sua senha?</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Digite seu e-mail para receber um link de redefinição
            </p>
          </div>

          {/* Feedback de Status */}
          {msg && (
            <div className={`mb-6 p-6 rounded-xl text-center ${
              msg.t === "ok" 
                ? "bg-green-500/10 border border-green-500/20" 
                : "bg-destructive/10 border border-destructive/20"
            }`}>
              <p className={`text-sm font-medium ${
                msg.t === "ok" ? "text-green-700" : "text-red-700"
              }`}>
                {msg.m}
              </p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={onSubmit} className="space-y-6">
            <AuthInput
              label="E-mail"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="seu@exemplo.com"
              required
              error={!emailOk && email.length > 0 ? "E-mail inválido" : undefined}
            />

            <button
              type="submit"
              disabled={loading || !emailOk}
              className="w-full h-11 bg-brand-primary text-white font-medium rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {loading && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              )}
              {loading ? "Enviando..." : "Enviar Link de Redefinição"}
            </button>
          </form>

          {/* Links de Apoio */}
          <div className="mt-8 pt-6 border-t border-border space-y-3">
            <div className="text-center">
              <Link 
                href="/login" 
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                ← Voltar para Login
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} GladPros. Sistema de gestão empresarial.
          </p>
        </div>
      </div>
    </div>
  )
}