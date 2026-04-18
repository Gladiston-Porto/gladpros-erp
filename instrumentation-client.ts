import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura erros em produção e dev — ajuste conforme necessidade
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: grava o que o usuário fazia quando o erro ocorreu
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      // Ocultar campos sensíveis automaticamente (senhas, tokens)
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Tunnel para evitar bloqueio por ad-blockers
  tunnel: '/api/sentry-tunnel',

  // Desabilita output verboso em dev
  debug: false,
});
