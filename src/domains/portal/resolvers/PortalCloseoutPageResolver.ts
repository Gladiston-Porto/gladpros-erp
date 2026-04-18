import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { PortalCloseoutSafe, PortalCloseoutService } from "@/domains/portal/services/PortalCloseoutService";

const PORTAL_CLOSEOUT_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

export type PortalCloseoutView = {
  closeout: PortalCloseoutSafe;
};

function checkPortalCloseoutRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:closeout:ip:${ip}`, PORTAL_CLOSEOUT_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(
    `portal:closeout:iptoken:${ip}:${tokenHashPrefix}`,
    PORTAL_CLOSEOUT_RATE_LIMIT
  );
  return ipTokenLimit.allowed;
}

export async function resolvePortalCloseoutView(
  token: string,
  ip: string
): Promise<PortalCloseoutView | null> {
  if (!checkPortalCloseoutRateLimit(token, ip)) {
    return null;
  }

  const service = new PortalCloseoutService();
  const closeout = await service.getByToken(token);

  if (!closeout) {
    return null;
  }

  return { closeout };
}
