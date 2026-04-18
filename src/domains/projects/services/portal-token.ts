import { createHash, randomBytes } from "crypto";

const PORTAL_TOKEN_BYTES = 32;
const PORTAL_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

export function generatePortalAccessToken(): string {
  return randomBytes(PORTAL_TOKEN_BYTES).toString("base64url");
}

export function hashPortalAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isPortalAccessTokenFormatValid(token: string): boolean {
  if (typeof token !== "string") {
    return false;
  }

  return PORTAL_TOKEN_REGEX.test(token);
}
