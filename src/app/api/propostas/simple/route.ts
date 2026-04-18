import { withErrorHandler } from '@/lib/api/error-handler';
// src/app/api/propostas/simple/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple compatibility endpoint kept for legacy clients.
 * Currently disabled: returns an empty, safe payload so client bundles
 * that still call this route don't loop on 500 errors.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  console.warn('[Propostas Simple API] simple route disabled; returning safe empty result')
  const { searchParams } = new URL(request.url)
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100)
  return NextResponse.json({ data: [], total: 0, page: 1, pageSize, totalPages: 0 })
});
