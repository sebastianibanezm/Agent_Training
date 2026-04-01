import { NextRequest } from 'next/server'
import { applyMiddleware } from '@/lib/auth/middleware'

export function middleware(req: NextRequest) {
  return applyMiddleware(req)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
