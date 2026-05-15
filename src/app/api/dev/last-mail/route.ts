import { NextRequest, NextResponse } from "next/server";
import { getLastDevMail } from "@/shared/lib/mailer";

// Allowed in local dev OR when E2E_MODE=1 (set only in .env.e2e — never in production).
function isAllowed() {
  return process.env.NODE_ENV === "development" || process.env.E2E_MODE === "1";
}

// Global store shared between mailer.ts and email.ts captures
const globalForMail = global as unknown as {
  __lastMail?: { to: string; subject: string; html: string; sentAt: string };
  __mailByRecipient?: Record<string, { to: string; subject: string; html: string; sentAt: string }>;
};

export async function GET(request: NextRequest) {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    // If ?to= is provided, look up per-recipient store (prevents cross-worker interference)
    const toParam = request.nextUrl.searchParams.get('to');
    if (toParam) {
      const entry = globalForMail.__mailByRecipient?.[toParam.toLowerCase()];
      if (!entry) {
        return NextResponse.json({ found: false, message: `No mail recorded for ${toParam}` }, { status: 200 });
      }
      return NextResponse.json({ found: true, mail: entry }, { status: 200 });
    }

    // Fallback: single-slot (backward compat)
    const last = globalForMail.__lastMail ?? getLastDevMail();
    if (!last) {
      return NextResponse.json({ found: false, message: "No mail recorded yet" }, { status: 200 });
    }
    return NextResponse.json({ found: true, mail: last }, { status: 200 });
  } catch (e) {
    console.error("/api/dev/last-mail error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// DELETE /api/dev/last-mail — clears captured mail between E2E tests
export async function DELETE(request: NextRequest) {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // If ?to= is provided, only clear that recipient's slot
  const toParam = request.nextUrl.searchParams.get('to');
  if (toParam) {
    if (globalForMail.__mailByRecipient) {
      delete globalForMail.__mailByRecipient[toParam.toLowerCase()];
    }
    return NextResponse.json({ cleared: true, to: toParam }, { status: 200 });
  }

  // Clear everything
  globalForMail.__lastMail = undefined;
  globalForMail.__mailByRecipient = {};
  return NextResponse.json({ cleared: true }, { status: 200 });
}
