import { NextResponse } from 'next/server';
import { createSession, hashPin, verifyPin } from '@/lib/auth';
import { getAccess, setConfig } from '@/lib/config-store';
import { envPin } from '@/lib/pins';
import type { Role } from '@/lib/types';

const ROLES: Role[] = ['prod', 'auditor', 'admin'];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role = body.role as Role;
  const pin = String(body.pin ?? '');
  const area = body.area ? String(body.area) : null;

  if (!pin) return NextResponse.json({ error: 'Isi PIN.' }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Peran tidak valid.' }, { status: 400 });

  const access = (await getAccess()) || {};
  const setup = !access.admin && !envPin('admin');

  if (setup) {
    if (pin.length < 4) return NextResponse.json({ error: 'PIN minimal 4 karakter.' }, { status: 400 });
    const h = await hashPin(pin);
    await setConfig('access', { ...access, admin: h });
    await createSession({ role: 'admin', area: null, hash: h });
    return NextResponse.json({ ok: true, role: 'admin', area: null, setup: true });
  }

  const useArea = role === 'prod' ? area : null;

  const envp = envPin(role);
  if (envp) {
    if (pin !== envp) return NextResponse.json({ error: 'PIN salah.' }, { status: 401 });
    await createSession({ role, area: useArea, hash: 'env:' + role });
    return NextResponse.json({ ok: true, role, area: useArea });
  }

  const stored = access[role];
  if (!stored) return NextResponse.json({ error: 'PIN untuk peran ini belum diatur oleh admin.' }, { status: 401 });
  if (!(await verifyPin(pin, stored))) return NextResponse.json({ error: 'PIN salah.' }, { status: 401 });

  await createSession({ role, area: useArea, hash: stored });
  return NextResponse.json({ ok: true, role, area: useArea });
}
