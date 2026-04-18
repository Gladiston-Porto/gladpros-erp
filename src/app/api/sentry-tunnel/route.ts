/**
 * Sentry Tunnel Route
 * Encaminha eventos do Sentry evitando bloqueio por ad-blockers.
 * Ref: https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */
import { NextRequest, NextResponse } from 'next/server';

const SENTRY_HOST = 'o4511221607759872.ingest.us.sentry.io';
const SENTRY_PROJECT_ID = '4511221611102208';

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const pieces = envelope.split('\n');
    const header = JSON.parse(pieces[0]) as { dsn?: string };

    const dsn = new URL(header.dsn ?? '');
    if (dsn.hostname !== SENTRY_HOST) {
      return NextResponse.json({ error: 'Invalid DSN' }, { status: 400 });
    }

    const projectId = dsn.pathname.replace('/', '');
    if (projectId !== SENTRY_PROJECT_ID) {
      return NextResponse.json({ error: 'Invalid project' }, { status: 400 });
    }

    const upstream = await fetch(
      `https://${SENTRY_HOST}/api/${projectId}/envelope/`,
      {
        method: 'POST',
        body: envelope,
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
      }
    );

    return new NextResponse(upstream.body, {
      status: upstream.status,
    });
  } catch {
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 });
  }
}
