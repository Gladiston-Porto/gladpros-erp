export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerEventHandlers } = await import('@/server/events/register-handlers');
    registerEventHandlers();
    console.log('[Instrumentation] Event handlers registered');
  }
}
