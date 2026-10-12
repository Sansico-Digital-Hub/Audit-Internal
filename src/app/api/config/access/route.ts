import { NextResponse } from 'next/server';
import { createSession, hashPin, readSession } from '@/lib/auth';
import { getAccess, setConfig } from '@/lib/config-store';
import { envPin } from '@/lib/pins';
import type { AccessConfig } from '@/lib/config-store';

export async function PUT(req: Request) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const upd: AccessConfig = {};
  for (const r of ['prod', 'auditor', 'admin'] as const) {
    if (envPin(r)) continue;
    const v = String(body[r] ?? '');
    if (v) {
      if (v.length < 4) return NextResponse.json({ error: 'PIN minimal 4 karakter.' }, { status: 400 });
      upd[r] = await hashPin(v);
    }
  }
  if (!Object.keys(upd).length) return NextResponse.json({ error: 'PIN diatur melalui environment.' }, { status: 400 });

  const access = (await getAccess()) || {};
  const next = { ...access, ...upd };
  await setConfig('access', next);

  if (upd.admin) await createSession({ role: 'admin', area: null, hash: upd.admin });
  return NextResponse.json({ ok: true });
}
