import { NextRequest, NextResponse } from 'next/server'
import { requireClientePermission } from '@/shared/lib/rbac'
import { lookupZip } from '@/lib/validation/zip-lookup'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { withErrorHandler } from '@/lib/api/error-handler'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const rl = await apiRateLimit.isAllowed(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', message: rl.message, success: false },
      { status: 429 }
    )
  }

  await requireClientePermission(request, 'canRead')
  const zip = request.nextUrl.searchParams.get('zip') ?? ''
  const result = await lookupZip(zip)
  return NextResponse.json({ data: result, success: true })
})
