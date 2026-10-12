import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { photos } from '@/lib/db/schema';
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
  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ ok: true });
}
