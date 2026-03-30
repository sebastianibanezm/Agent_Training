import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export interface SessionData {
  authenticated: boolean
}

export const sessionOptions = {
  cookieName: 'demo_session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function getRequestSession(req: NextRequest): Promise<IronSession<SessionData>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<SessionData>(req.cookies as any, sessionOptions)
}
