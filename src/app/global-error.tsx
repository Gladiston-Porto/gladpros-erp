'use client'

import { useEffect } from 'react';

/**
 * Global error boundary — catches errors in the root layout.
 * Must define its own <html> and <body> since it replaces the root layout entirely.
 *
 * Sentry is loaded via dynamic import ONLY in production.
 * In dev, process.env.NODE_ENV === 'development' causes dead code elimination:
 * webpack removes the import('@sentry/nextjs') branch entirely, avoiding the
 * @opentelemetry/instrumentation "critical dependency" warning that appeared on
 * every route compilation and was responsible for +3000 modules per route in dev.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      void import('@sentry/nextjs').then(Sentry => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[hsl(222.2,84%,4.9%)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[hsl(222.2,84%,8%)] rounded-2xl shadow-lg p-8 text-center border border-[hsl(217.2,32.6%,17.5%)]">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Erro inesperado
          </h1>
          <p className="text-slate-400 mb-6">
            Ocorreu um erro crítico no sistema. Pedimos desculpas pelo inconveniente.
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre className="bg-red-950 text-red-400 text-xs text-left p-3 rounded mb-4 overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="rounded-xl bg-[#0098DA] px-4 py-2 text-sm font-medium text-white hover:bg-[#007bb5] transition-colors"
            >
              Tentar novamente
            </button>
            <a
              href="/dashboard"
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Voltar ao Dashboard
            </a>
          </div>
          {error?.digest && (
            <p className="text-xs text-slate-500 mt-4">
              Código: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
