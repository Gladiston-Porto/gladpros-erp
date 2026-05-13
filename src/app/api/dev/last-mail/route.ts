import { NextResponse } from "next/server";
import { getLastDevMail } from "@/shared/lib/mailer";

// Allowed in local dev OR when E2E_MODE=1 (set only in .env.e2e — never in production).
function isAllowed() {
  return process.env.NODE_ENV === "development" || process.env.E2E_MODE === "1";
}

// Global store shared between mailer.ts and email.ts captures
const globalForMail = global as unknown as {
  __lastMail?: { to: string; subject: string; html: string; sentAt: string };
};

export async function GET() {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    // Prefer the richer EmailService capture; fall back to mailer.ts capture
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
export async function DELETE() {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  globalForMail.__lastMail = undefined;
  return NextResponse.json({ cleared: true }, { status: 200 });
}
