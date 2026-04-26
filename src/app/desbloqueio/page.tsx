"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense, useCallback } from "react"
import { AuthInput } from "@gladpros/ui/auth-input";
import { authApi } from "@/lib/api/client";


function DesbloqueioView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams?.get('email') || ''
  
  const [step, setStep] = useState<'identify' | 'pin' | 'security'>('identify')
  const [email, setEmail] = useState(emailParam)
  const [pin, setPin] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [userInfo, setUserInfo] = useState<{
    id: number;
    email: string;
    nomeCompleto: string;
    requiresPinUnlock: boolean;
    requiresSecurityQuestion: boolean;
    perguntaSecreta?: string;
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Buscar informações do usuário bloqueado
  const checkUserStatus = useCallback(async () => {
    if (!email.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await authApi.getUserStatus({ email: email.trim() })
      
      if (!result.blocked) {
        setError('Esta conta não está bloqueada.')
        return
      }
      
      setUserInfo(result.user)
      
      // Determinar método de desbloqueio disponível
      if (result.user.requiresPinUnlock) {
        setStep('pin')
      } else if (result.user.requiresSecurityQuestion) {
        setStep('security')
      } else {
        setError('Esta conta não possui métodos de desbloqueio configurados. Entre em contato com o administrador.')
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [email])

  // Desbloquear com PIN
  async function unlockWithPin() {
    if (!userInfo || !pin.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      await authApi.unlockUser({
        method: 'pin',
        userId: userInfo.id,
        pin: pin.trim()
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao desbloquear conta'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Desbloquear com pergunta de segurança
  async function unlockWithSecurity() {
    if (!userInfo || !securityAnswer.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      await authApi.unlockUser({
        method: 'security',
        userId: userInfo.id,
        answer: securityAnswer.trim()
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao desbloquear conta'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-check se email foi passado por parâmetro
  useEffect(() => {
    if (emailParam && step === 'identify') {
      // call without adding function to deps to avoid re-creation loops
      checkUserStatus()
    }
  }, [emailParam, step, checkUserStatus])

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-elevated p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Conta Desbloqueada!</h1>
            <p className="text-muted-foreground mb-4">
              Sua conta foi desbloqueada com sucesso. Você será redirecionado para a página de login.
            </p>
            <div className="text-sm text-muted-foreground">
              Redirecionando em 2 segundos...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Image 
              src="/images/LOGO_300.png" 
              alt="GladPros" 
              width={80} 
              height={80} 
              className="mx-auto mb-4 rounded-xl"
              style={{ height: 'auto' }}
            />
            <h1 className="text-2xl font-bold text-foreground">Desbloquear Conta</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {step === 'identify' && "Informe seu email para verificar opções de desbloqueio"}
              {step === 'pin' && "Digite seu PIN de 4 dígitos para desbloquear"}
              {step === 'security' && "Responda sua pergunta de segurança"}
            </p>
          </div>

          {/* Feedback de Erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Etapa 1: Identificação */}
          {step === 'identify' && (
            <form onSubmit={(e) => { e.preventDefault(); checkUserStatus(); }} className="space-y-6">
              <AuthInput
                label="E-mail da conta bloqueada"
                name="email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="seu@exemplo.com"
                required
              />

              <button
                type="submit"
                disabled={loading || !/.+@.+\..+/.test(email)}
                className="w-full h-11 bg-brand-primary text-white font-medium rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {loading && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                )}
                {loading ? "Verificando..." : "Verificar Conta"}
              </button>
            </form>
          )}

          {/* Etapa 2: Desbloqueio com PIN */}
          {step === 'pin' && userInfo && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                <h3 className="font-medium text-foreground mb-1">Conta Identificada</h3>
                <p className="text-muted-foreground text-sm">{userInfo.nomeCompleto}</p>
                <p className="text-primary text-xs">{userInfo.email}</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); unlockWithPin(); }} className="space-y-6">
                <div>
                  <label htmlFor="pin-desbloqueio" className="mb-2 block text-sm font-medium text-foreground/80">
                    PIN de Segurança (4 dígitos)
                  </label>
                  <input
                    id="pin-desbloqueio"
                    type="password"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setPin(value)
                    }}
                    placeholder="****"
                    maxLength={4}
                    aria-label="PIN de segurança com 4 dígitos"
                    autoComplete="current-password"
                    className="w-32 h-11 rounded-xl border border-border bg-background text-foreground px-4 py-3 text-center text-lg tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('identify')}
                    className="flex-1 h-11 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || pin.length !== 4}
                    className="flex-1 h-11 bg-brand-primary text-white font-medium rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    )}
                    {loading ? "Desbloqueando..." : "Desbloquear"}
                  </button>
                </div>

                {/* Opção alternativa */}
                {userInfo.requiresSecurityQuestion && (
                  <div className="text-center pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setStep('security')}
                      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                    >
                      Usar pergunta de segurança
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Etapa 3: Desbloqueio com Pergunta de Segurança */}
          {step === 'security' && userInfo && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                <h3 className="font-medium text-foreground mb-1">Conta Identificada</h3>
                <p className="text-muted-foreground text-sm">{userInfo.nomeCompleto}</p>
                <p className="text-primary text-xs">{userInfo.email}</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); unlockWithSecurity(); }} className="space-y-6">
                {userInfo.perguntaSecreta && (
                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                    <h3 className="font-medium text-amber-600 dark:text-amber-400 mb-1">Pergunta de Segurança</h3>
                    <p className="text-amber-700 dark:text-amber-300 text-sm">{userInfo.perguntaSecreta}</p>
                  </div>
                )}

                <AuthInput
                  label="Resposta de Segurança"
                  name="security-answer"
                  value={securityAnswer}
                  onChange={setSecurityAnswer}
                  placeholder="Digite sua resposta"
                  required
                />

                <div className="bg-muted/50 p-3 rounded-xl border border-border">
                  <p className="text-muted-foreground text-xs">
                    💡 <strong>Dica:</strong> Digite a resposta exatamente como cadastrou, sem acentos e em letras minúsculas.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('identify')}
                    className="flex-1 h-11 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !securityAnswer.trim()}
                    className="flex-1 h-11 bg-brand-primary text-white font-medium rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    )}
                    {loading ? "Desbloqueando..." : "Desbloquear"}
                  </button>
                </div>

                {/* Opção alternativa */}
                {userInfo.requiresPinUnlock && (
                  <div className="text-center pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setStep('pin')}
                      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                    >
                      Usar PIN de segurança
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Links de Apoio */}
          <div className="mt-8 pt-6 border-t border-border space-y-3">
            <div className="text-center">
              <Link 
                href="/login" 
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Voltar para Login
              </Link>
            </div>
            <div className="text-center">
              <Link 
                href="/esqueci-senha" 
                className="text-brand-primary hover:text-brand-primary/80 text-sm font-medium transition-colors"
              >
                Esqueceu sua senha?
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

export default function DesbloqueioPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DesbloqueioView />
    </Suspense>
  )
}
