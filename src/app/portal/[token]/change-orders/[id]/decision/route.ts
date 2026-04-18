import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { PortalChangeOrderDecisionService } from "@/domains/portal/services/PortalChangeOrderDecisionService";

export const dynamic = "force-dynamic";

const PORTAL_CO_DECISION_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

function notFoundResponse() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

function checkPortalCoDecisionRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:co:decision:ip:${ip}`, PORTAL_CO_DECISION_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(
    `portal:co:decision:iptoken:${ip}:${tokenHashPrefix}`,
    PORTAL_CO_DECISION_RATE_LIMIT
  );

  return ipTokenLimit.allowed;
}

type RouteContext = {
  params: Promise<{
    token: string;
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  noStore();

  try {
    const [{ token, id }, headerStore] = await Promise.all([context.params, headers()]);
    const ip = getClientIp(headerStore);

    if (!checkPortalCoDecisionRateLimit(token, ip)) {
      return notFoundResponse();
    }

    const rawBody = await request.json().catch(() => null);
    const action = typeof rawBody?.action === "string" ? rawBody.action.toLowerCase() : "";
    const name = typeof rawBody?.name === "string" ? rawBody.name : "";

    const changeOrderId = Number(id);

    const decisionService = new PortalChangeOrderDecisionService();
    const result = await decisionService.decideByToken({
      token,
      changeOrderId,
      action,
      name,
      ip,
      userAgent: headerStore.get("user-agent") ?? "unknown",
    });

    if (!result) {
      return notFoundResponse();
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return notFoundResponse();
  }
}
