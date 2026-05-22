/**
 * Retry helper for transient DB init errors (e.g., P1001 on container boot).
 * Retries only for PrismaClientInitializationError or P1001 errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { code?: string; errorCode?: string; name?: string } | undefined;
      const code = e?.code || e?.errorCode;
      const name = e?.name;
      const isInit = name === "PrismaClientInitializationError" || code === "P1001";
      if (!isInit || i === retries) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
