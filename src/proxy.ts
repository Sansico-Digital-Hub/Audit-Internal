import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_TTL_HOURS } from '@/lib/constants';
import { allowedPaths, defaultPath } from '@/lib/nav';
import type { Role } from '@/lib/types';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-insecure-secret-change-me-please-32-bytes',
);
const PROTECTED = ['/dashboard', '/departemen', '/temuan', '/input', '/riwayat', '/area', '/checklist', '/akses'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('audit_session')?.value;

  let role: Role | undefined;
  let area: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (!payload.iat || Date.now() / 1000 - payload.iat > SESSION_TTL_HOURS * 60 * 60) throw new Error('expired');
      role = payload.role as Role;
      area = (payload.area as string) ?? null;
    } catch {
      /* token tidak valid */
    }
  }

  const home = () => new URL(defaultPath(role, /^d/.test(area || '')), req.url);

  if (pathname === '/login') {
    return role ? NextResponse.redirect(home()) : NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) return NextResponse.next();
  if (!role) return NextResponse.redirect(new URL(token ? '/login?expired=1' : '/login', req.url));

  const allowed = allowedPaths(role);
  if (!allowed.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(home());
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/departemen', '/temuan', '/input', '/riwayat', '/area', '/checklist', '/akses', '/login'],
};
