import { NextResponse } from 'next/server';
import { createSession, hashPin, readSession } from '@/lib/auth';
import { getAccess, getScopePins, setConfig } from '@/lib/config-store';
import type { AccessConfig } from '@/lib/config-store';

export async function PUT(req: Request) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // PIN per peran
  const upd: AccessConfig = {};
  for (const r of ['prod', 'auditor', 'admin'] as const) {
    const v = String(body[r] ?? '');
    if (v) {
      if (v.length < 4) return NextResponse.json({ error: 'PIN minimal 4 karakter.' }, { status: 400 });
      upd[r] = await hashPin(v);
    }
  }

  // PIN per area/unit (scope): { [scopeId]: pin } ; "" = hapus (pakai PIN Produksi)
  const scopeInput = (body.scopePins && typeof body.scopePins === 'object' ? body.scopePins : {}) as Record<string, string>;
  const scopePins = { ...((await getScopePins()) || {}) };
  let scopeChanged = false;
  for (const [id, raw] of Object.entries(scopeInput)) {
    const v = String(raw ?? '');
    if (v === '') {
      if (scopePins[id]) {
        delete scopePins[id];
        scopeChanged = true;
      }
    } else {
      if (v.length < 4) return NextResponse.json({ error: 'PIN minimal 4 karakter.' }, { status: 400 });
      scopePins[id] = await hashPin(v);
      scopeChanged = true;
    }
  }

  if (!Object.keys(upd).length && !scopeChanged) {
    return NextResponse.json({ error: 'Belum ada PIN yang diisi.' }, { status: 400 });
  }

  const access = (await getAccess()) || {};
  if (Object.keys(upd).length) {
    const next = { ...access, ...upd };
    await setConfig('access', next);
    if (upd.admin) {
      await createSession({ role: 'admin', area: null, hash: upd.admin });
      return NextResponse.json({ ok: true });
    }
  }
  if (scopeChanged) await setConfig('scopepins', scopePins);

  return NextResponse.json({ ok: true });
}
