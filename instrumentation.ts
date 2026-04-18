export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(
  error: { digest?: string } & Error,
  _request: unknown,
  _context: unknown,
) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureException(error);
}
