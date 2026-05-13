import { createHmac, timingSafeEqual } from "crypto";

type MfaChallengeAction = "LOGIN" | "RESET" | "PRIMEIRO_ACESSO" | "DESBLOQUEIO";

function getChallengeSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured for MFA challenge signing");
  }
  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getChallengeSecret()).update(payload).digest("base64url");
}

export function createMfaChallenge(params: {
  userId: number;
  tipoAcao: MfaChallengeAction;
  ttlSeconds?: number;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? 5 * 60);
  const payload = `${params.userId}.${params.tipoAcao}.${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

export function verifyMfaChallenge(token: string, expected: {
  userId: number;
  tipoAcao: MfaChallengeAction;
}) {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const parts = decoded.split(".");
  if (parts.length !== 4) return false;

  const [userIdRaw, action, expiresAtRaw, signature] = parts;
  const userId = Number(userIdRaw);
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isInteger(userId) || userId !== expected.userId) return false;
  if (action !== expected.tipoAcao) return false;
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const payload = `${userIdRaw}.${action}.${expiresAtRaw}`;
  const expectedSignature = signPayload(payload);
  const provided = Buffer.from(signature);
  const computed = Buffer.from(expectedSignature);

  return provided.length === computed.length && timingSafeEqual(provided, computed);
}
