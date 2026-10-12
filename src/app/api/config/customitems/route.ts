import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config-store';
import type { CustomConfig } from '@/lib/config-store';
import type { CustomItem } from '@/lib/types';

export async function GET() {
  const cfg = await getConfig<CustomConfig>('customitems');
  return NextResponse.json({ list: cfg?.list || [] });
}

export async function PUT(req: Request) {
  const s = await readSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const list: CustomItem[] = Array.isArray(body.list) ? body.list : [];
  await setConfig('customitems', { list });
  return NextResponse.json({ ok: true });
}
