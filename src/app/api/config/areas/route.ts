import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { setConfig } from '@/lib/config-store';

export async function PUT(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.list)
    ? body.list
        .filter((a: { id?: string; name?: string }) => a?.id && String(a.name ?? '').trim())
        .map((a: { id: string; name: string }) => ({ id: String(a.id), name: String(a.name).trim() }))
    : [];
  await setConfig('areas', { list });
  return NextResponse.json({ ok: true });
}
