import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { SESSION_TTL_HOURS } from './constants';
import type { Role } from './types';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-insecure-secret-change-me-please-32-bytes',
);
const COOKIE = 'audit_session';

export interface Session {
  role: Role;
  area: string | null;
  hash: string;
  exp?: number;
}

export const hashPin = (pin: string) => bcrypt.hash(pin, 10);
export const verifyPin = (pin: string, hash: string) => bcrypt.compare(pin, hash);

export async function createSession(sess: Session) {
  const token = await new SignJWT(sess as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(SECRET);
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_COOKIE_SECURE
      ? process.env.SESSION_COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function readSession(): Promise<Session | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, SECRET);
    // Token lama (sebelum TTL 12 jam) tetap dipaksa berakhir 12 jam sejak login.
    if (!payload.iat || Date.now() / 1000 - payload.iat > SESSION_TTL_HOURS * 60 * 60) return null;
    return { role: payload.role as Role, area: (payload.area as string) ?? null, hash: payload.hash as string, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
}
