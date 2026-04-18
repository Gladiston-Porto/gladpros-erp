export const runtime = "nodejs";
import { NextResponse } from "next/server";

// Neutralized debug endpoint: always disabled
export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
