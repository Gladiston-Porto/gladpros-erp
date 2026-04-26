"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { authApi } from "@/lib/api/client"

function MFAVerification() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Dados do usuário vindos da tela de login
  const userId = searchParams?.get('userId')
  const userEmail = searchParams?.get('email') || ''
  const userName = searchParams?.get('name') || ''
  const isFirstAccess = searchParams?.get('firstAccess') === 'true'
  const [code, setCode] = useState(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [canResend, setCanResend] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      router.push('/login')
      return
    }

    // Timer para expiração do código
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [userId, router])

  const handleSubmit = useCallback(async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Digite o código completo de 6 dígitos')
      return
    }
    if (loading || submitted) return
    setSubmitted(true)
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      // Fazer a verificação via API diretamente
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(userId!),
          code: fullCode,
          tipoAcao: isFirstAccess ? 'PRIMEIRO_ACESSO' : 'LOGIN'
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error || 'Falha na verificação do código')
      }

      const data = await response.json().catch(() => ({} as { redirectUrl?: string }))
      const redirectUrl = typeof data.redirectUrl === 'string' && data.redirectUrl.length > 0
        ? data.redirectUrl
        : '/dashboard'

      router.replace(redirectUrl)

      return

    } catch (error) {
      // Error handled via UI state
      setError((error as Error).message)
      
      // Limpar código em caso de erro
      setCode(Array(6).fill(''))
      inputRefs.current[0]?.focus()
  // Permitir novo auto-submit após correção
  autoSubmittedRef.current = false
      setSubmitted(false)
    } finally {
      setLoading(false)
    }
  }, [code, isFirstAccess, router, userId, loading, submitted])

  useEffect(() => {
    // Auto-submit quando todos os campos estão preenchidos (uma única vez)
    if (code.every(digit => digit !== '') && !loading && !submitted && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      handleSubmit()
    }
  }, [code, loading, submitted, handleSubmit])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Apenas números

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Apenas o último dígito
    setCode(newCode)

    // Auto-focus no próximo campo
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      setCode(pastedData.split(''))
      inputRefs.current[5]?.focus()
    }
  }


  const handleResendCode = async () => {
    if (!canResend) return

    setLoading(true)
    setError(null)
    setInfo(null)
    
    try {
      await authApi.resendMFA({
        userId: parseInt(userId!, 10),
        tipoAcao: isFirstAccess ? 'PRIMEIRO_ACESSO' : 'LOGIN'
      });

  // Resetar timer e estado
      setTimeLeft(300)
      setCanResend(false)
      setCode(Array(6).fill(''))
      inputRefs.current[0]?.focus()
  setInfo('Novo código enviado para seu email.')

    } catch (error) {
      // Error handled via UI state
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return <div>Redirecionando...</div>
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-elevated border border-border w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Image 
            src="/images/LOGO_300.png" 
            alt="GladPros" 
            width={80} 
            height={80} 
            className="mx-auto mb-4 rounded-2xl"
          />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Verificação de Segurança
          </h1>
          <p className="text-muted-foreground text-sm">
            {isFirstAccess 
              ? 'Digite o código enviado para finalizar o primeiro acesso'
              : 'Digite o código de verificação enviado para seu email'
            }
          </p>
        </div>

        {/* Info do usuário */}
        <div className="bg-primary/10 p-4 rounded-xl mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </div>

    {(error || info) && (
          <div className={`mb-6 p-4 border rounded-2xl ${error ? 'bg-destructive/10 border-destructive/20' : 'bg-brand-primary/10 border-brand-primary/20'}`}>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {info && <p className="text-brand-primary text-sm">{info}</p>}
          </div>
        )}

        {/* Campos do código */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground/80 mb-3">
            Código de Verificação
          </label>
          <div className="flex space-x-2 justify-center">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-xl font-semibold bg-background text-foreground border-2 border-border rounded-xl focus:border-primary focus:outline-none"
                maxLength={1}
                disabled={loading || submitted}
                aria-label={`Dígito ${index + 1} do código de verificação`}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          {timeLeft > 0 ? (
            <p className="text-sm text-muted-foreground">
              Código expira em: <span className="font-semibold text-primary">{formatTime(timeLeft)}</span>
            </p>
          ) : (
            <p className="text-sm text-destructive">
              Código expirado. Solicite um novo código.
            </p>
          )}
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={submitted || loading || code.some(digit => digit === '') || timeLeft === 0}
            className="w-full py-3 px-4 bg-brand-primary text-white rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center"
          >
            {(loading || submitted) && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />}
            {isFirstAccess ? 'Finalizar Primeiro Acesso' : 'Verificar e Entrar'}
          </button>

          <button
            onClick={handleResendCode}
            disabled={!canResend || loading}
            className="w-full py-2 px-4 text-primary border border-primary rounded-xl hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reenviar Código
          </button>
        </div>

        {/* Rodapé */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="bg-amber-500/10 p-4 rounded-xl">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400 text-sm mb-2">🔒 Dicas de Segurança:</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• O código tem 6 dígitos e expira em 5 minutos</li>
              <li>• Nunca compartilhe este código com ninguém</li>
              <li>• Se não solicitou, feche esta janela</li>
            </ul>
          </div>
        </div>

        {/* Link para voltar */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Voltar para Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MFAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    }>
      <MFAVerification />
    </Suspense>
  )
}
