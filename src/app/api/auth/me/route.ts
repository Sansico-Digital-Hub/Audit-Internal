import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getAccess, getScopePins } from '@/lib/config-store';

export async function GET() {
  const s = await readSession();
  if (!s) return NextResponse.json({ role: null, area: null });
  const access = (await getAccess()) || {};
  const scopePins = (await getScopePins()) || {};
  let stored = access[s.role];
  if (s.role === 'prod' && s.area && scopePins[s.area]) stored = scopePins[s.area];
  if (stored && stored !== s.hash) {
    return NextResponse.json({ role: null, area: null, invalid: true });
  }
  return NextResponse.json({ role: s.role, area: s.area });
}
