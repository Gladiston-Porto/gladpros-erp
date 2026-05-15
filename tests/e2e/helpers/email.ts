/**
 * E2E Email Helper
 *
 * Works with /api/dev/last-mail (enabled when E2E_MODE=1).
 * EmailService updates __lastMail in-memory; this helper reads it via HTTP.
 *
 * Design: all helpers are stateless functions that receive `request` (Playwright
 * APIRequestContext) so they work from any spec without global setup coupling.
 */

import type { APIRequestContext } from '@playwright/test';

const POLL_INTERVAL_MS = 300;
const DEFAULT_TIMEOUT_MS = 10_000;

interface CapturedMail {
  to: string;
  subject: string;
  html: string;
  sentAt: string;
}

interface LastMailResponse {
  found: boolean;
  mail?: CapturedMail;
  message?: string;
}

/**
 * Clears the captured mail store before starting an action that sends an email.
 * Pass `to` to only clear that specific recipient's slot (prevents cross-worker interference).
 */
export async function clearLastEmail(
  request: APIRequestContext,
  baseURL: string,
  to?: string
): Promise<void> {
  const url = to
    ? `${baseURL}/api/dev/last-mail?to=${encodeURIComponent(to)}`
    : `${baseURL}/api/dev/last-mail`;
  await request.delete(url);
}

/**
 * Polls /api/dev/last-mail until an email arrives (or timeout).
 * Pass `afterTime` (Date.now() before triggering the email action) to ensure
 * you don't accidentally pick up a stale email from a previous test.
 * Pass `to` to use per-recipient store (prevents cross-worker interference).
 */
export async function waitForEmail(
  request: APIRequestContext,
  baseURL: string,
  opts: { afterTime?: number; timeoutMs?: number; to?: string } = {}
): Promise<CapturedMail> {
  const { afterTime, timeoutMs = DEFAULT_TIMEOUT_MS, to } = opts;
  const deadline = Date.now() + timeoutMs;
  const url = to
    ? `${baseURL}/api/dev/last-mail?to=${encodeURIComponent(to)}`
    : `${baseURL}/api/dev/last-mail`;

  while (Date.now() < deadline) {
    const resp = await request.get(url);

    if (resp.ok()) {
      const body: LastMailResponse = await resp.json();
      if (body.found && body.mail) {
        // If a freshness fence is given, verify the email was sent after that point.
        if (afterTime && new Date(body.mail.sentAt).getTime() < afterTime) {
          // Stale email — keep polling
        } else {
          return body.mail;
        }
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `waitForEmail: no email arrived within ${timeoutMs}ms` +
    (to ? ` (for ${to})` : '') +
    (afterTime ? ` (after ${new Date(afterTime).toISOString()})` : '')
  );
}

/**
 * Extracts the 6-digit MFA code from the email HTML.
 * The template renders the code inside <div class="code-text">XXXXXX</div>.
 */
export function extractMfaCode(html: string): string {
  // Primary: code-text div (MFA template)
  const divMatch = html.match(/class="code-text"[^>]*>\s*(\d{6})\s*</);
  if (divMatch) return divMatch[1];

  // Fallback: plain-text section "Seu código de verificação é: XXXXXX"
  const textMatch = html.match(/(?:código de verificação é:|verification code is:)\s*(\d{6})/i);
  if (textMatch) return textMatch[1];

  throw new Error('extractMfaCode: could not find a 6-digit code in email HTML');
}

/**
 * Extracts the first URL matching `pattern` from the email HTML.
 * Useful for reset-password and first-access links.
 *
 * @example
 *   const resetLink = extractLink(html, /redefinir-senha\?token=[A-Za-z0-9_-]+/);
 */
export function extractLink(html: string, pattern: RegExp): string {
  // Look inside href="..." attributes
  const hrefRegex = /href="([^"]*?)"/g;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    if (pattern.test(match[1])) return match[1];
  }

  // Fallback: bare URL in text (plain-text section of the email)
  const bareRegex = new RegExp(`https?://[^\\s"<>]*${pattern.source}[^\\s"<>]*`);
  const bareMatch = html.match(bareRegex);
  if (bareMatch) return bareMatch[0];

  throw new Error(`extractLink: no URL matching ${pattern} found in email`);
}

// ─── MFA helpers ─────────────────────────────────────────────────────────────

interface MfaChallengeResponse {
  success: boolean;
  mfaChallenge: string;
  userId: number;
}

/**
 * Creates an MFA challenge + code via /api/dev/mfa-challenge (E2E_MODE only).
 * Returns the signed mfaChallenge token needed to call resend/verify.
 * The code is available via getMfaCode() after this call.
 */
export async function setupMfaChallenge(
  request: APIRequestContext,
  baseURL: string,
  userId: number,
  tipoAcao: "LOGIN" | "RESET" | "PRIMEIRO_ACESSO" | "DESBLOQUEIO" = "LOGIN"
): Promise<MfaChallengeResponse> {
  const resp = await request.post(`${baseURL}/api/dev/mfa-challenge`, {
    data: { userId, tipoAcao },
    headers: { "Content-Type": "application/json" },
  });

  if (!resp.ok()) {
    throw new Error(
      `setupMfaChallenge failed (${resp.status()}): ${await resp.text()}`
    );
  }

  const body = await resp.json();
  if (!body.mfaChallenge) {
    throw new Error(`setupMfaChallenge: missing mfaChallenge in response: ${JSON.stringify(body)}`);
  }

  return body as MfaChallengeResponse;
}

interface MfaCodeResponse {
  success: boolean;
  mfa?: { usuarioId: number; code: string; tipoAcao: string };
  error?: string;
}

/**
 * Retrieves the last generated MFA code from server memory.
 * Works when TEST_MODE=true, E2E_MODE=1, or NODE_ENV=development.
 *
 * Pass `userId` to use the per-userId store — prevents cross-worker interference
 * when multiple test workers generate codes for different users concurrently.
 * The function polls until the code is available (useful right after login trigger).
 */
export async function getMfaCode(
  request: APIRequestContext,
  baseURL: string,
  userId?: number
): Promise<string> {
  const url = userId
    ? `${baseURL}/api/test-helpers/get-last-mfa?userId=${userId}`
    : `${baseURL}/api/test-helpers/get-last-mfa`;

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const resp = await request.get(url);
    if (resp.ok()) {
      const body: MfaCodeResponse = await resp.json();
      const code = body.mfa?.code;
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(
    `getMfaCode: timeout waiting for code${userId ? ` for userId ${userId}` : ''}`
  );
}

// ─── Email convenience ────────────────────────────────────────────────────────

/**
 * Convenience: clear + wait in one call.
 * Pass `to` to use per-recipient isolation (recommended in parallel tests).
 *
 * @example
 *   const [, mail] = await withEmailCapture(request, BASE_URL, async () => {
 *     await page.request.post('/api/auth/forgot-password', { data: { email } });
 *   }, { to: email });
 */
export async function withEmailCapture(
  request: APIRequestContext,
  baseURL: string,
  action: () => Promise<void>,
  opts: { timeoutMs?: number; to?: string } = {}
): Promise<[void, CapturedMail]> {
  const { to, ...waitOpts } = opts;
  await clearLastEmail(request, baseURL, to);
  const before = Date.now();
  const result = await action();
  const mail = await waitForEmail(request, baseURL, { afterTime: before, to, ...waitOpts });
  return [result, mail];
}
