import { NextResponse } from "next/server";
import { getLastDevMail } from "@/shared/lib/mailer";

export async function GET() {
  // Segurança: só permitir em development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const last = getLastDevMail();
    if (!last) {
      return NextResponse.json({ found: false, message: "No dev mail recorded yet" }, { status: 200 });
    }
    return NextResponse.json({ found: true, mail: last }, { status: 200 });
  } catch (e) {
    console.error("/api/dev/last-mail error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
