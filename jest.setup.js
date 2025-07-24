import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Polyfill for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables
process.env.VERCEL_KV_URL = 'redis://localhost:6379'
process.env.KV_REST_API_URL = 'http://localhost:3000/api/kv'
process.env.KV_REST_API_TOKEN = 'test-token'
process.env.VERCEL_KV_REST_API_URL = 'http://localhost:3000/api/kv'
process.env.VERCEL_KV_REST_API_TOKEN = 'test-token'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.COINGECKO_API_KEY = 'test-coingecko-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

// Suppress console errors during tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})