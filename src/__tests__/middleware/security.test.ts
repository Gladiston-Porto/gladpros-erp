import { middleware } from '../../../middleware'
import type { NextRequest } from 'next/server'

type MockHeaders = {
  store: Map<string, string>
  get: jest.Mock<string | undefined, [string]>
  set: jest.Mock<void, [string, string]>
}

jest.mock('next/server', () => {
  const createMockHeaders = (): MockHeaders => {
    const store = new Map<string, string>()
    return {
      store,
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value)
      }),
    }
  }

  const NextResponse: any = function (this: any, body: unknown = null, init: { status?: number; headers?: MockHeaders } = {}) {
    if (!(this instanceof NextResponse)) {
      return new (NextResponse as any)(body, init)
    }
    this.headers = init.headers ?? createMockHeaders()
    this.cookies = { set: jest.fn(), delete: jest.fn() }
    this.status = init.status
    this.body = body
  }

  ;(NextResponse as any).next = jest.fn(() => {
    const instance = new (NextResponse as any)()
    const mockHeaders = createMockHeaders()
    instance.headers = mockHeaders
    // Ensure get() actually retrieves from the store
    instance.headers.get = jest.fn((key: string) => mockHeaders.store.get(key))
    return instance
  })
  ;(NextResponse as any).json = jest.fn((body: unknown, init: { status?: number } = {}) => new (NextResponse as any)(body, init))
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ;(NextResponse as any).redirect = jest.fn((url: string) => {
    const instance = new (NextResponse as any)(null, { status: 307 })
    instance.headers = createMockHeaders()
    return instance
  })

  return {
    NextResponse,
    NextRequest: class {},
  }
})

// Mock do logger
jest.mock('../../../shared/lib/logger', () => ({
  default: {
    info: jest.fn(),
  }
}), { virtual: true })

// Mock rate limiter
jest.mock('../../../src/lib/security/rate-limiter', () => ({
  rateLimitMiddleware: jest.fn().mockResolvedValue(null),
  isIpBlocked: jest.fn().mockResolvedValue(false),
}))

// Mock security headers
jest.mock('../../../src/lib/security/headers', () => ({
  applySecurityHeaders: jest.fn((response) => {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }),
  getDevSecurityHeaders: jest.fn(() => ({})),
  getProdSecurityHeaders: jest.fn(() => ({})),
}))

const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: {
    next: jest.Mock
    json: jest.Mock
  }
}

const { isIpBlocked } = jest.requireMock('../../../src/lib/security/rate-limiter')

const createRequest = (overrides: Partial<NextRequest> = {}): NextRequest => ({
  method: 'GET',
  nextUrl: { 
    pathname: '/api/test',
    clone: function() { return this }
  } as any,
  headers: new Headers({
    'user-agent': 'test-agent',
    origin: 'http://localhost:3000',
  }),
  cookies: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  } as any,
  ...overrides,
}) as unknown as NextRequest

describe('Middleware (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.skip('adiciona headers de segurança básicos', async () => {
    const response = await middleware(createRequest())

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it.skip('aplica CORS para rotas de API com origem permitida', async () => {
    const response = await middleware(createRequest())

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS')
  })

  it('ignora CORS para rotas que não são API', async () => {
    const mockUrl = {
      pathname: '/dashboard',
      searchParams: {
        set: jest.fn()
      },
      clone: function() { 
        return {
          ...this,
          searchParams: {
            set: jest.fn()
          }
        }
      }
    }
    const request = createRequest({
      nextUrl: mockUrl as any,
    })

    const response = await middleware(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeUndefined()
  })

  it.skip('honra a lista de origens customizada', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com'
    const request = createRequest({
      headers: new Headers({
        origin: 'https://example.com',
      }),
    })

    const response = await middleware(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    delete process.env.ALLOWED_ORIGINS
  })

  it.skip('responde pré-flight OPTIONS imediatamente', async () => {
    const request = createRequest({ method: 'OPTIONS' })
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  it('bloqueia IPs sinalizados', async () => {
    isIpBlocked.mockResolvedValueOnce(true)
    const request = createRequest()

    const response = await middleware(request)

    expect(response.status).toBe(403)
    expect(NextResponse.json).toHaveBeenCalled()
  })
})
