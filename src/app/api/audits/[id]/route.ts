import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { audits, photos } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const rows = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  if (!rows.length) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 });
  const cur = rows[0];
  if (s.role === 'prod' && cur.areaId !== s.area) {
    return NextResponse.json({ error: 'Di luar area Anda.' }, { status: 403 });
  }
  if (s.role === 'prod' && b?.fields && Object.keys(b.fields as object).length) {
    return NextResponse.json({ error: 'Produksi hanya dapat mengubah action plan.' }, { status: 403 });
  }
  if (s.role === 'prod' && b?.patch && typeof b.patch === 'object' && 'photos' in b.patch) {
    return NextResponse.json({ error: 'Foto temuan hanya dapat diunggah auditor/admin.' }, { status: 403 });
  }
  if (s.role === 'prod' && b?.patch && typeof b.patch === 'object' && 'donePhotos' in b.patch) {
    const f = (cur.finds as Record<string, { status?: string } | undefined>)[String(b.n)];
    if ((f?.status || 'Open') === 'Closed') {
      return NextResponse.json({ error: 'Temuan sudah Closed. Foto bukti tidak dapat ditambah lagi.' }, { status: 403 });
    }
  }

  const set: Record<string, unknown> = {};
  if (b?.fields && typeof b.fields === 'object') {
    const f = b.fields as Record<string, unknown>;
    if (f.date != null) set.date = String(f.date);
    if (f.areaId != null) set.areaId = String(f.areaId);
    if (f.areaName != null) set.areaName = String(f.areaName);
    if (f.auditor != null) set.auditor = String(f.auditor);
    if (f.auditee != null) set.auditee = String(f.auditee);
    if (f.ans != null) set.ans = f.ans;
    if (f.score != null) set.score = f.score;
  }
  if (b?.n != null && b?.patch) {
    const finds = { ...((cur.finds as Record<string, unknown>) || {}) };
    finds[b.n] = { ...((finds[b.n] as object) || {}), ...b.patch };
    set.finds = finds;
  }
  if (!Object.keys(set).length) return NextResponse.json({ ok: true, changed: 0 });

  await db.update(audits).set(set).where(eq(audits.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });
  const { id } = await params;
  await db.delete(photos).where(eq(photos.auditId, id));
  await db.delete(audits).where(eq(audits.id, id));
  return NextResponse.json({ ok: true });
}
