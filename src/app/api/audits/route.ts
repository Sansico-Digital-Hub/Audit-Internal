import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function GET() {
  const rows = await db.select().from(audits);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b?.date || !b?.areaId || !b?.auditor || !b?.auditee) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }
  const id = String(b.id || `${b.date}_${b.areaId}_${Date.now().toString(36)}`);
  const row = {
    id,
    date: String(b.date),
    areaId: String(b.areaId),
    areaName: b.areaName ? String(b.areaName) : null,
    auditor: String(b.auditor),
    auditee: String(b.auditee),
    ans: b.ans || {},
    finds: b.finds || {},
    score: b.score || null,
    createdAt: Number(b.createdAt) || Date.now(),
  };
  await db.insert(audits).values(row).onConflictDoUpdate({ target: audits.id, set: row });
  return NextResponse.json({ ok: true, id });
}
