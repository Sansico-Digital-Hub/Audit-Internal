import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { audits, deptAudits, photos } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const dataUrl = String(b?.data ?? '');
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  const mime = b?.mime ? String(b.mime) : m ? m[1] : 'image/jpeg';
  const b64 = m ? m[2] : dataUrl;
  if (!b64) return NextResponse.json({ error: 'Data foto kosong.' }, { status: 400 });

  const auditId = String(b.auditId ?? '');
  const auditSrc = b.auditSrc ? String(b.auditSrc) : 'p';
  const kind = b.kind === 'donePhotos' ? 'donePhotos' : 'photos';
  if (s.role === 'prod') {
    const rows =
      auditSrc === 'd'
        ? await db.select({ scope: deptAudits.unit }).from(deptAudits).where(eq(deptAudits.id, auditId)).limit(1)
        : await db.select({ scope: audits.areaId }).from(audits).where(eq(audits.id, auditId)).limit(1);
    if (!rows.some((r) => r.scope === s.area)) {
      return NextResponse.json({ error: 'Di luar area/unit Anda.' }, { status: 403 });
    }
  }

  const id = `${auditId}_${b.n}_${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(photos).values({
    id,
    auditId,
    auditSrc,
    itemN: Number(b.n),
    kind,
    mime,
    data: Buffer.from(b64, 'base64'),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}
