import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock TextEncoder and TextDecoder for tests
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Setup environment variables for testing
process.env.CLIENT_DOC_ENCRYPTION_KEY_BASE64 = Buffer.from('a'.repeat(32)).toString('base64')
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Mock Prisma client
jest.mock('@/server/db', () => ({
  prisma: {
    cliente: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }
}))

// Mock AuditService
jest.mock('@/services/auditService', () => ({
  AuditService: {
    logAction: jest.fn(),
  }
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // Return a plain object representation instead of JSX
    return {
      $$typeof: Symbol.for('react.element'),
      type: 'img',
      props: { ...props, alt: props.alt || '' },
    }
  },
}))

// Global fetch mock
global.fetch = jest.fn()

// Mock window.confirm and window.alert
global.confirm = jest.fn()
global.alert = jest.fn()

beforeEach(() => {
  fetch.mockClear()
  confirm.mockClear()
  alert.mockClear()
})
