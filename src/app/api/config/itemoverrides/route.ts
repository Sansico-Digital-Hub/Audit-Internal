import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config-store';

type Overrides = Record<string, Record<string, { t?: string; r?: string; w?: number }>>;

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
  const hasW = Object.prototype.hasOwnProperty.call(b, 'w');
  const rawW = hasW && b.w !== '' && b.w != null ? Number(b.w) : undefined;
  if (rawW !== undefined && (!Number.isFinite(rawW) || rawW < 0)) {
    return NextResponse.json({ error: 'Bobot poin tidak valid.' }, { status: 400 });
  }

  const next = { ...(forScope[n] || {}) };
  if (t !== undefined) next.t = t;
  if (r !== undefined) next.r = r;
  if (hasW) {
    if (rawW === undefined) delete next.w;
    else next.w = rawW;
  }
  if (!next.t && !next.r && next.w === undefined) delete forScope[n];
  else forScope[n] = next;
  if (Object.keys(forScope).length) all[scope] = forScope;
  else delete all[scope];

  await setConfig('itemoverrides', all);
  return NextResponse.json({ ok: true });
}
