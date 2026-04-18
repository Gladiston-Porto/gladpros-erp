import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  try {
    const g = global as unknown as { __lastMFA?: { usuarioId: number; code: string; id: number; tipoAcao: string } };
    const last = g.__lastMFA ?? null;
    if (!last) return NextResponse.json({ found: false }, { status: 200 });
    return NextResponse.json({ found: true, last }, { status: 200 });
  } catch (e) {
    console.error('/api/dev/last-mfa error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
