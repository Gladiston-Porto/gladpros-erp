import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { checkRateLimit } from "@/domains/portal/security/rate-limit";

const PORTAL_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

export type PortalPageView = {
  project: NonNullable<Awaited<ReturnType<PortalTokenService["resolveSafeProjectByToken"]>>>;
};

export async function resolvePortalView(token: string, ip: string): Promise<PortalPageView | null> {
  const ipLimit = checkRateLimit(`portal:ip:${ip}`, PORTAL_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return null;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(`portal:iptoken:${ip}:${tokenHashPrefix}`, PORTAL_RATE_LIMIT);
  if (!ipTokenLimit.allowed) {
    return null;
  }

  const portalTokenService = new PortalTokenService();
  const project = await portalTokenService.resolveSafeProjectByToken(token);

  if (!project) {
    return null;
  }

  return { project };
}
