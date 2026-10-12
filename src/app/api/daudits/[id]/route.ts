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
  const finds = { ...((rows[0].finds as Record<string, unknown>) || {}) };
  if (b?.n != null && b?.patch) {
    finds[b.n] = { ...((finds[b.n] as object) || {}), ...b.patch };
  }
  await db.update(deptAudits).set({ finds }).where(eq(deptAudits.id, id));
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
