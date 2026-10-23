import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deptAudits, photos } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const rows = await db.select().from(deptAudits).where(eq(deptAudits.id, id)).limit(1);
  if (!rows.length) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 });
  const cur = rows[0];
  if (s.role === 'prod' && cur.unit !== s.area) {
    return NextResponse.json({ error: 'Di luar unit Anda.' }, { status: 403 });
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
    if (f.unit != null) set.unit = String(f.unit);
    if (f.unitName != null) set.unitName = String(f.unitName);
    if (f.dept != null) set.dept = String(f.dept);
    if (f.auditor != null) set.auditor = String(f.auditor);
    if (f.auditee != null) set.auditee = String(f.auditee);
    if (f.ans != null) set.ans = f.ans;
    if (f.score != null) set.score = f.score;
    if (f.finds != null && typeof f.finds === 'object') set.finds = f.finds;
  }
  if (b?.n != null && b?.patch) {
    const finds = { ...((cur.finds as Record<string, unknown>) || {}) };
    finds[b.n] = { ...((finds[b.n] as object) || {}), ...b.patch };
    set.finds = finds;
  }
  if (!Object.keys(set).length) return NextResponse.json({ ok: true, changed: 0 });

  await db.update(deptAudits).set(set).where(eq(deptAudits.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });
  const { id } = await params;
  await db.delete(photos).where(eq(photos.auditId, id));
  await db.delete(deptAudits).where(eq(deptAudits.id, id));
  return NextResponse.json({ ok: true });
}
