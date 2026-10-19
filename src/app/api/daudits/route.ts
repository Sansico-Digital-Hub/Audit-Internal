import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deptAudits } from '@/lib/db/schema';
import { readSession } from '@/lib/auth';

export async function GET() {
  const rows = await db.select().from(deptAudits);
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b?.date || !b?.unit || !b?.auditor || !b?.auditee) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }
  const id = String(b.id || `${b.date}_${b.unit}_${Date.now().toString(36)}`);
  const row = {
    id,
    unit: String(b.unit),
    unitName: b.unitName ? String(b.unitName) : null,
    dept: b.dept ? String(b.dept) : null,
    date: String(b.date),
    auditor: String(b.auditor),
    auditee: String(b.auditee),
    ans: b.ans || {},
    finds: b.finds || {},
    score: b.score || null,
    createdAt: Number(b.createdAt) || Date.now(),
  };
  await db.insert(deptAudits).values(row).onConflictDoUpdate({ target: deptAudits.id, set: row });
  return NextResponse.json({ ok: true, id });
}
