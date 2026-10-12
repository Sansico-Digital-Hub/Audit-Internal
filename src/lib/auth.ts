import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { Role } from './types';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-insecure-secret-change-me-please-32-bytes',
);
const COOKIE = 'audit_session';

export interface Session {
  role: Role;
  area: string | null;
  hash: string;
}

export const hashPin = (pin: string) => bcrypt.hash(pin, 10);
export const verifyPin = (pin: string, hash: string) => bcrypt.compare(pin, hash);

export async function createSession(sess: Session) {
  const token = await new SignJWT(sess as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_COOKIE_SECURE
      ? process.env.SESSION_COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readSession(): Promise<Session | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, SECRET);
    return { role: payload.role as Role, area: (payload.area as string) ?? null, hash: payload.hash as string };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
}
