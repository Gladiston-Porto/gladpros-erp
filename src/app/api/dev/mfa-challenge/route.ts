import { NextRequest, NextResponse } from "next/server";
import { MFAService } from "@/shared/lib/mfa";
import { createMfaChallenge } from "@/shared/lib/mfa-challenge";
import { z } from "zod";

// Only available in E2E test mode or development — never reachable in production.
function isAllowed() {
  return (
    process.env.E2E_MODE === "1" ||
    process.env.TEST_MODE === "true" ||
    process.env.NODE_ENV === "development"
  );
}

const schema = z.object({
  userId: z.number().int().positive(),
  tipoAcao: z.enum(["LOGIN", "RESET", "PRIMEIRO_ACESSO", "DESBLOQUEIO"]).default("LOGIN"),
});

/**
 * POST /api/dev/mfa-challenge
 *
 * E2E helper: generates an MFA code for the given userId and returns a signed
 * mfaChallenge token.  The code is stored in global.__lastMFA so tests can
 * retrieve it via GET /api/test-helpers/get-last-mfa.
 *
 * Only works when E2E_MODE=1, TEST_MODE=true, or NODE_ENV=development.
 * Returns 404 in production.
 */
export async function POST(req: NextRequest) {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "userId (number) obrigatório", success: false },
      { status: 400 }
    );
  }

  const { userId, tipoAcao } = parsed.data;

  try {
    // Generate a real MFA code (stored in DB + captured in global.__lastMFA)
    await MFAService.createMFACode({
      usuarioId: userId,
      tipoAcao,
      ip: "e2e-test",
      userAgent: "playwright-e2e",
    });

    // Create a signed challenge token that resend/verify will accept
    const mfaChallenge = createMfaChallenge({ userId, tipoAcao });

    return NextResponse.json({ success: true, mfaChallenge, userId }, { status: 200 });
  } catch (err) {
    console.error("/api/dev/mfa-challenge error:", err);
    return NextResponse.json(
      { error: "Failed to create MFA challenge", success: false },
      { status: 500 }
    );
  }
}
