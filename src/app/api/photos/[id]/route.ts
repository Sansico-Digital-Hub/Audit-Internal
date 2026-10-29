import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { audits, deptAudits, photos } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db
    .select({ data: photos.data, mime: photos.mime })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);
  if (!rows.length) return new Response('Not found', { status: 404 });
  const bytes = new Uint8Array(rows[0].data);
  return new Response(bytes, {
    headers: {
      'Content-Type': rows[0].mime,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const { id } = await params;
  const rows = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  const photo = rows[0];
  if (!photo) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 });
  if (s.role === 'prod') {
    const auditRows =
      photo.auditSrc === 'd'
        ? await db.select({ scope: deptAudits.unit, finds: deptAudits.finds }).from(deptAudits).where(eq(deptAudits.id, photo.auditId)).limit(1)
        : await db.select({ scope: audits.areaId, finds: audits.finds }).from(audits).where(eq(audits.id, photo.auditId)).limit(1);
    const audit = auditRows[0];
    if (!audit || audit.scope !== s.area) {
      return NextResponse.json({ error: 'Di luar area/unit Anda.' }, { status: 403 });
    }
    if (photo.kind !== 'donePhotos') {
      return NextResponse.json({ error: 'Foto temuan hanya dapat diubah auditor/admin.' }, { status: 403 });
    }
    const finds = audit.finds as Record<string, { status?: string } | undefined>;
    if ((finds[String(photo.itemN)]?.status || 'Open') === 'Closed') {
      return NextResponse.json({ error: 'Temuan sudah Closed. Foto bukti tidak dapat dihapus/diganti lagi.' }, { status: 403 });
    }
  }
  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ ok: true });
}
