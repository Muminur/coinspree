import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { kv } from '@vercel/kv'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/' ||
    pathname === '/unsubscribe'
  ) {
    return NextResponse.next()
  }

  const sessionId = request.cookies.get('session')?.value

  if (!sessionId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Add timeout to prevent hanging KV calls
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('KV timeout')), 5000)
    )

    const userId = await Promise.race([
      kv.get(`session:${sessionId}`),
      timeoutPromise,
    ])

    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const user = await Promise.race([
      kv.hgetall(`user:${userId}`),
      timeoutPromise,
    ]) as any

    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin route protection
    if (pathname.startsWith('/admin') && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/admin/:path*'],
}
