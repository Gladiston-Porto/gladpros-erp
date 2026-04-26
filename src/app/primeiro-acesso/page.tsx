"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { validatePassword, getPasswordStrength, type PasswordStrengthResult } from "@/shared/lib/password-client";
import { authApi } from "@/lib/api/client";
import { DynamicBar } from "@/components/ui/dynamic-bar";

/** Mapeamento de cor hex → classes Tailwind (evita inline style para cor) */
const STRENGTH_CLASS: Record<string, { text: string; bg: string }> = {
  '#ef4444': { text: 'text-red-500',    bg: 'bg-red-500'    },
  '#f97316': { text: 'text-orange-500', bg: 'bg-orange-500' },
  '#eab308': { text: 'text-yellow-500', bg: 'bg-yellow-500' },
  '#84cc16': { text: 'text-lime-500',   bg: 'bg-lime-500'   },
  '#22c55e': { text: 'text-green-500',  bg: 'bg-green-500'  },
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

function FirstAccessSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams?.get('userId')

  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dados do formulário
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  
  // Validação
  type PasswordStrength = PasswordStrengthResult
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)

  const steps: SetupStep[] = [
    {
      id: "password",
      title: "Nova Senha",
      description: "Defina uma senha segura para sua conta",
      completed: false
    },
    {
      id: "pin", 
      title: "PIN de Segurança",
      description: "Crie um PIN de 4 dígitos para desbloqueio",
      completed: false
    },
    {
      id: "security",
      title: "Pergunta de Segurança", 
      description: "Configure uma pergunta para recuperação de conta",
      completed: false
    },
    {
      id: "confirm",
      title: "Confirmação",
      description: "Revise e finalize sua configuração",
      completed: false
    }
  ]

  const securityQuestions = [
    "Qual é o nome do seu primeiro animal de estimação?",
    "Em que cidade você nasceu?", 
    "Qual é o nome de solteira da sua mãe?",
    "Qual foi sua primeira escola?",
    "Qual é seu filme favorito?",
    "Qual é o nome da sua rua favorita?",
    "Qual foi seu primeiro emprego?",
    "Qual é sua comida favorita?"
  ]

  useEffect(() => {
    if (!userId) {
      router.push('/login')
      return
    }
  }, [userId, router])

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(getPasswordStrength(newPassword))
    } else {
      setPasswordStrength(null)
    }
  }, [newPassword])

  const canProceedPassword = () => {
    if (!newPassword || !confirmPassword) return false
    if (newPassword !== confirmPassword) return false
    const validation = validatePassword(newPassword)
    return validation.valid
  }

  const canProceedPin = () => {
    return pin.length === 4 && confirmPin.length === 4 && pin === confirmPin && /^\d{4}$/.test(pin)
  }

  const canProceedSecurity = () => {
    return securityQuestion && securityAnswer.length >= 3
  }

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      await handleFinish()
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await authApi.setupFirstAccess({
        userId: parseInt(userId!),
        newPassword,
        pin,
        securityQuestion,
        securityAnswer: securityAnswer.toLowerCase().trim()
      })

      // Sucesso - redirecionar para dashboard
      router.push('/dashboard?setup=complete')

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
      <div className="bg-card rounded-2xl shadow-elevated border border-border w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-hero-gradient text-white p-6">
          <div className="flex items-center space-x-4">
            <Image 
              src="/images/LOGO_300.png" 
              alt="GladPros" 
              width={60} 
              height={60} 
              className="rounded-2xl"
            />
            <div>
              <h1 className="text-2xl font-bold">Bem-vindo ao GladPros!</h1>
              <p className="text-blue-100">Configure sua conta para começar</p>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar com steps */}
          <div className="w-1/3 bg-muted/30 p-6">
            <h2 className="font-semibold text-foreground mb-4">Passos da Configuração</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-center space-x-3 p-3 rounded-2xl ${
                    index === currentStep 
                      ? 'bg-primary/10 border-2 border-primary/30' 
                      : index < currentStep 
                        ? 'bg-green-500/10 border-2 border-green-500/30'
                        : 'bg-card border-2 border-border'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === currentStep 
                      ? 'bg-brand-primary text-white'
                      : index < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="w-2/3 p-8">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Step 1: Nova Senha */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Defina sua Nova Senha</h2>
                <p className="text-muted-foreground mb-6">
                  Crie uma senha forte que será usada para acessar sua conta.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="pa-nova-senha" className="block text-sm font-medium text-foreground/80 mb-2">
                      Nova Senha
                    </label>
                    <input
                      id="pa-nova-senha"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Digite sua nova senha"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label htmlFor="pa-confirmar-senha" className="block text-sm font-medium text-foreground/80 mb-2">
                      Confirmar Senha
                    </label>
                    <input
                      id="pa-confirmar-senha"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Digite novamente sua senha"
                      autoComplete="new-password"
                    />
                  </div>

                  {passwordStrength && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Força da Senha</span>
                        <span className={`text-sm font-semibold ${STRENGTH_CLASS[passwordStrength.color]?.text ?? 'text-muted-foreground'}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-3">
                        <DynamicBar
                          value={passwordStrength.score}
                          className={`h-2 rounded-full transition-all duration-300 ${STRENGTH_CLASS[passwordStrength.color]?.bg ?? 'bg-muted-foreground'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        {passwordStrength.criteriaMet.map((criteria: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-green-500 text-xs">✓</span>
                            <span className="text-xs text-muted-foreground">{criteria}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-primary/10 p-4 rounded-xl">
                    <h4 className="font-semibold text-primary text-sm mb-2">Requisitos da Senha:</h4>
                    <ul className="text-sm text-primary/80 space-y-1">
                      <li>• Mínimo 9 caracteres</li>
                      <li>• Pelo menos 1 letra maiúscula</li>
                      <li>• Pelo menos 1 número</li>
                      <li>• Pelo menos 1 símbolo (!@#$%&*)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: PIN de Segurança */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">PIN de Segurança</h2>
                <p className="text-muted-foreground mb-6">
                  Crie um PIN de 4 dígitos que será usado para desbloquear sua conta em casos de bloqueio.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="pa-pin" className="block text-sm font-medium text-foreground/80 mb-2">
                      PIN (4 dígitos)
                    </label>
                    <input
                      id="pa-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setPin(value)
                      }}
                      className="w-32 px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-lg tracking-widest"
                      placeholder="****"
                      maxLength={4}
                      aria-label="PIN de segurança com 4 dígitos"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label htmlFor="pa-confirmar-pin" className="block text-sm font-medium text-foreground/80 mb-2">
                      Confirmar PIN
                    </label>
                    <input
                      id="pa-confirmar-pin"
                      type="password"
                      value={confirmPin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setConfirmPin(value)
                      }}
                      className="w-32 px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-lg tracking-widest"
                      placeholder="****"
                      maxLength={4}
                      aria-label="Confirmar PIN de segurança"
                      autoComplete="new-password"
                    />
                  </div>

                  {pin && confirmPin && pin !== confirmPin && (
                <p className="text-destructive text-sm">Os PINs não coincidem</p>
                  )}

                  <div className="bg-amber-500/10 p-4 rounded-xl">
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 text-sm mb-2">🔒 Sobre o PIN:</h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Use apenas números (0-9)</li>
                      <li>• Evite sequências óbvias (1234, 0000)</li>
                      <li>• Será necessário para desbloquear a conta</li>
                      <li>• Mantenha-o seguro e não compartilhe</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Pergunta de Segurança */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Pergunta de Segurança</h2>
                <p className="text-muted-foreground mb-6">
                  Escolha uma pergunta de segurança que será usada para recuperar sua conta.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      Pergunta de Segurança
                    </label>
                    <select
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label="Pergunta de Segurança"
                    >
                      <option value="">Selecione uma pergunta...</option>
                      {securityQuestions.map((question, index) => (
                        <option key={index} value={question}>{question}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pa-resposta-seguranca" className="block text-sm font-medium text-foreground/80 mb-2">
                      Resposta
                    </label>
                    <input
                      id="pa-resposta-seguranca"
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Digite sua resposta"
                      autoComplete="off"
                    />
                  </div>

                  <div className="bg-green-500/10 p-4 rounded-xl">
                    <h4 className="font-semibold text-green-600 dark:text-green-400 text-sm mb-2">💡 Dicas:</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• Escolha algo que você nunca esquecerá</li>
                      <li>• Seja específico na resposta</li>
                      <li>• Use apenas letras minúsculas</li>
                      <li>• Evite acentos e caracteres especiais</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmação */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Configuração Completa</h2>
                <p className="text-muted-foreground mb-6">
                  Revise suas configurações antes de finalizar.
                </p>

                <div className="space-y-4">
                  <div className="bg-green-500/10 p-4 rounded-xl">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-3">✓ Configurações Definidas:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">Nova senha:</span>
                        <span className="text-green-700 dark:text-green-300 font-medium">••••••••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">PIN de segurança:</span>
                        <span className="text-green-700 dark:text-green-300 font-medium">••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">Pergunta de segurança:</span>
                        <span className="text-green-700 dark:text-green-300 font-medium">Configurada</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 p-4 rounded-xl">
                    <h4 className="font-semibold text-primary text-sm mb-2">🎉 Próximos Passos:</h4>
                    <ul className="text-sm text-primary/80 space-y-1">
                      <li>• Sua senha provisória será substituída</li>
                      <li>• Você será redirecionado para o dashboard</li>
                      <li>• Poderá acessar todas as funcionalidades do sistema</li>
                      <li>• Suas configurações de segurança estarão ativas</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de navegação */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0 || loading}
                className="px-4 py-2 text-foreground bg-muted rounded-xl hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <button
                onClick={handleNext}
                disabled={
                  loading || 
                  (currentStep === 0 && !canProceedPassword()) ||
                  (currentStep === 1 && !canProceedPin()) ||
                  (currentStep === 2 && !canProceedSecurity())
                }
                className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />}
                {currentStep === steps.length - 1 ? 'Finalizar Configuração' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FirstAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando configuração...</p>
        </div>
      </div>
    }>
      <FirstAccessSetup />
    </Suspense>
  )
}
