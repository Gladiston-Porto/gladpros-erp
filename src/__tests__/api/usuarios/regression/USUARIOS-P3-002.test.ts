// @bug:USUARIOS-P3-002
// @description: Endpoint dev/create-test-user deve manter bcrypt salt rounds 12.

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRawUnsafe: jest.fn(),
  },
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      json: jest.fn().mockResolvedValue(data),
    })),
  },
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

describe('REGRESSION USUARIOS-P3-002', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('bloqueia uso fora de development', async () => {
    const { POST } = await import('@/app/api/dev/create-test-user/route')
    process.env.NODE_ENV = 'production'
    const req = {
      json: jest.fn().mockResolvedValue({ email: 'a@b.com', password: '123456' }),
    } as unknown as Request

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('NOT_ALLOWED')
  })

  it('usa bcrypt hash com salt rounds 12 no fluxo válido', async () => {
    const { POST } = await import('@/app/api/dev/create-test-user/route')
    process.env.NODE_ENV = 'development'
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass')
    ;(prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1)

    const req = {
      json: jest.fn().mockResolvedValue({ email: 'dev@gladpros.com', password: 'abc12345' }),
    } as unknown as Request

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(bcrypt.hash).toHaveBeenCalledWith('abc12345', 12)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled()
  })
})