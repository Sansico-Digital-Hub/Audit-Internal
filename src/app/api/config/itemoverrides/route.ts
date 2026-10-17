import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config-store';

type Overrides = Record<string, Record<string, { t?: string; r?: string }>>;

// Body: { scope, n, t, r }  → override teks/acuan satu poin yang sudah ada.
// Kirim t/r kosong (undefined) untuk menghapus override (kembali ke teks asli).
export async function PUT(req: Request) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const scope = String(b.scope ?? '');
  const n = String(b.n ?? '');
  if (!scope || !n) return NextResponse.json({ error: 'Scope/poin tidak valid.' }, { status: 400 });

  const all: Overrides = { ...((await getConfig<Overrides>('itemoverrides')) || {}) };
  const forScope = { ...(all[scope] || {}) };

  const t = typeof b.t === 'string' ? b.t.trim() : undefined;
  const r = typeof b.r === 'string' ? b.r.trim() : undefined;

  if (!t && !r) {
    delete forScope[n];
  } else {
    forScope[n] = { ...(forScope[n] || {}), ...(t !== undefined ? { t } : {}), ...(r !== undefined ? { r } : {}) };
  }
  if (Object.keys(forScope).length) all[scope] = forScope;
  else delete all[scope];

  await setConfig('itemoverrides', all);
  return NextResponse.json({ ok: true });
}
