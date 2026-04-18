"use client"
import Image from 'next/image'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Image
            src="/images/LOGO_300.png"
            alt="GladPros"
            width={200}
            height={60}
            className="mx-auto opacity-70"
          />
        </div>
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M5 7l.867 12.142A2 2 0 007.86 21h8.28a2 2 0 001.993-1.858L19 7m-7 4v6m-4-6v6m8-6v6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Erro Interno do Servidor</h1>
              <p className="text-muted-foreground mb-6">Ocorreu um problema ao processar sua solicitação. Tente novamente em instantes.</p>
              {process.env.NODE_ENV !== 'production' && (
                <p className="text-xs text-muted-foreground mb-4 break-all">{error?.message}</p>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => reset()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  Tentar Novamente
                </button>
                <a
                  href="/dashboard"
                  className="block w-full bg-muted hover:bg-muted/80 text-foreground font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  Ir para Dashboard
                </a>
              </div>
              <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>&copy; 2025 GladPros. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </div>
  )
}
