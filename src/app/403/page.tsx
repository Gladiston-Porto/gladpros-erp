'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Forbidden() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/images/LOGO_300.png"
            alt="GladPros"
            width={200}
            height={60}
            className="mx-auto opacity-70"
          />
        </div>

        {/* Erro 403 */}
        <div className="bg-card rounded-2xl shadow-elevated p-8 border border-border">
          <div className="text-orange-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">403</h1>
          <h2 className="text-xl font-semibold text-orange-600 mb-4">Acesso Negado</h2>
          
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar este recurso. 
            Entre em contato com o administrador do sistema se precisar de acesso.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Ir para Dashboard
            </button>
            
            <button
              onClick={() => router.back()}
              className="w-full bg-muted hover:bg-muted/80 text-foreground font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Voltar
            </button>
          </div>

          {/* Informações sobre permissões */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="bg-orange-500/10 rounded-xl p-4 mb-4">
              <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Por que estou vendo isso?</h3>
              <ul className="text-sm text-orange-700 dark:text-orange-300 text-left space-y-1">
                <li>• Seu nível de acesso não permite esta ação</li>
                <li>• A página requer permissões especiais</li>
                <li>• Você pode estar tentando acessar dados de outro usuário</li>
              </ul>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">Precisa de mais permissões?</p>
            <a 
              href="mailto:admin@gladpros.com" 
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Solicitar acesso ao administrador
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 GladPros. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
