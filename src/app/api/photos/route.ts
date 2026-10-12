import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { photos } from '@/lib/db/schema';
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

  const id = `${b.auditId}_${b.n}_${b.kind || 'photos'}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  await db.insert(photos).values({
    id,
    auditId: String(b.auditId),
    auditSrc: b.auditSrc ? String(b.auditSrc) : 'p',
    itemN: Number(b.n),
    kind: b.kind ? String(b.kind) : 'photos',
    mime,
    data: Buffer.from(b64, 'base64'),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}
