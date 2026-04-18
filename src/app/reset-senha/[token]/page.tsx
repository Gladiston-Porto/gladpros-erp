"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useParams } from "next/navigation"
import { AuthPassword } from "@gladpros/ui/auth-password";
import { PasswordService } from "@/shared/lib/password";

export default function ResetSenhaPage() {
  const params = useParams() as { token: string }
  const token = params.token
  
  const [senha, setSenha] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null)

  // Validações
  const passwordValidation = PasswordService.validatePassword(senha)
  const passwordsMatch = senha === confirm && senha.length > 0

  // Critérios individuais para feedback visual
  const criterios = [
    { 
      id: 'length', 
      texto: 'Mínimo 9 caracteres', 
      atendido: senha.length >= 9,
      ativo: senha.length > 0
    },
    { 
      id: 'uppercase', 
      texto: '1 letra maiúscula', 
      atendido: /[A-Z]/.test(senha),
      ativo: senha.length > 0
    },
    { 
      id: 'lowercase', 
      texto: '1 letra minúscula', 
      atendido: /[a-z]/.test(senha),
      ativo: senha.length > 0
    },
    { 
      id: 'number', 
      texto: '1 número', 
      atendido: /\d/.test(senha),
      ativo: senha.length > 0
    },
    { 
      id: 'symbol', 
      texto: '1 símbolo (!@#$%^&*)', 
      atendido: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
      ativo: senha.length > 0
    }
  ]

  const criteriosAtendidos = criterios.filter(c => c.atendido).length
  const forcaSenha = criteriosAtendidos === 0 ? 0 : 
                    criteriosAtendidos <= 2 ? 1 : 
                    criteriosAtendidos <= 4 ? 2 : 3

  const corForca = ['transparent', '#ef4444', '#f59e0b', '#10b981'][forcaSenha]
  const textoForca = ['', 'Fraca', 'Média', 'Forte'][forcaSenha]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    
    if (!passwordValidation.valid) {
      return setMsg({ 
        t: "err", 
        m: "Senha deve ter mín. 9 caracteres, 1 maiúscula, 1 número e 1 símbolo." 
      })
    }
    
    if (!passwordsMatch) {
      return setMsg({ t: "err", m: "As senhas não coincidem." })
    }
    
    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      })
      
      const json = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        throw new Error(json?.error || "Falha ao redefinir senha")
      }
      
      setMsg({ 
        t: "ok", 
        m: "Senha redefinida com sucesso! Você já pode fazer login." 
      })
      
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro inesperado"
      setMsg({ t: "err", m: errorMsg })
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Defina uma nova senha segura para sua conta
            </p>
          </div>

          {/* Feedback de Status */}
          {msg && (
            <div className={`mb-6 p-4 rounded-xl ${
              msg.t === "ok" 
                ? "bg-green-500/10 border border-green-500/20" 
                : "bg-destructive/10 border border-destructive/20"
            }`}>
              <p className={`text-sm ${
                msg.t === "ok" ? "text-green-700" : "text-red-700"
              }`}>
                {msg.m}
              </p>
            </div>
          )}

          {/* Formulário */}
          {msg?.t !== "ok" && (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-4">
                <AuthPassword
                  label="Nova senha"
                  name="senha"
                  value={senha}
                  onChange={setSenha}
                  placeholder="Digite sua nova senha"
                  required
                />

                {/* Barra de força da senha */}
                {senha.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Força da senha:</span>
                      <span className={`font-medium ${
                        forcaSenha === 1 ? 'text-red-600' : 
                        forcaSenha === 2 ? 'text-amber-600' : 
                        forcaSenha === 3 ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {textoForca}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300 ease-in-out"
                        style={{ 
                          width: `${(criteriosAtendidos / 5) * 100}%`,
                          backgroundColor: corForca
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Critérios da senha com feedback visual */}
                {senha.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center mr-2">
                        ✓
                      </span>
                      Critérios da senha
                    </h4>
                    <div className="space-y-2">
                      {criterios.map((criterio) => (
                        <div 
                          key={criterio.id} 
                          className={`flex items-center text-sm transition-all duration-200 ${
                            !criterio.ativo ? 'text-muted-foreground' : 
                            criterio.atendido ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 text-xs transition-all duration-200 ${
                            !criterio.ativo ? 'border-border bg-muted' :
                            criterio.atendido ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-50'
                          }`}>
                            {criterio.atendido && criterio.ativo && '✓'}
                          </span>
                          <span className={criterio.atendido && criterio.ativo ? 'line-through' : ''}>
                            {criterio.texto}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {passwordValidation.valid && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center text-green-700 text-sm">
                          <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center mr-2">
                            ✓
                          </span>
                          <span className="font-medium">Senha forte! Todos os critérios atendidos.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <AuthPassword
                  label="Confirmar nova senha"
                  name="confirm"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Digite a senha novamente"
                  required
                  error={
                    !passwordsMatch && confirm.length > 0 
                      ? "Senhas não coincidem" 
                      : undefined
                  }
                />

                {/* Feedback de confirmação */}
                {confirm.length > 0 && (
                  <div className={`flex items-center text-sm ${
                    passwordsMatch ? 'text-green-600' : 'text-red-500'
                  }`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2 text-xs ${
                      passwordsMatch ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-50'
                    }`}>
                      {passwordsMatch && '✓'}
                    </span>
                    {passwordsMatch ? 'Senhas coincidem' : 'As senhas não coincidem'}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordValidation.valid || !passwordsMatch}
                className="w-full h-12 bg-brand-primary text-white font-semibold rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-base"
              >
                {loading && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                )}
                {loading ? "Salvando nova senha..." : "Confirmar Nova Senha"}
              </button>
            </form>
          )}

          {/* Sucesso - Feedback aprimorado e link para login */}
          {msg?.t === "ok" && (
            <div className="text-center space-y-6">
              {/* Ícone de sucesso */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              
              {/* Mensagem de sucesso */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Senha alterada com sucesso!</h3>
                <p className="text-muted-foreground text-sm">
                  Sua nova senha foi definida e já está ativa. Você pode fazer login agora usando suas novas credenciais.
                </p>
              </div>
              
              {/* Botão call-to-action */}
              <Link 
                href="/login"
                className="w-full h-12 bg-brand-primary text-white font-semibold rounded-xl hover:brightness-110 transition-all duration-200 flex items-center justify-center text-base"
              >
                Fazer Login com Nova Senha
              </Link>
              
              {/* Dica de segurança */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-primary text-lg">💡</span>
                  <div className="text-left">
                    <h4 className="font-medium text-foreground text-sm">Dica de segurança</h4>
                    <p className="text-muted-foreground text-xs mt-1">
                      Mantenha sua senha segura e não a compartilhe. Se suspeitar de atividade não autorizada, altere-a imediatamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Links de Apoio */}
          <div className="mt-8 pt-6 border-t border-border">
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