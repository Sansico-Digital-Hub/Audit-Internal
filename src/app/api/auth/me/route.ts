import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getAccess } from '@/lib/config-store';
import { envPin } from '@/lib/pins';

export async function GET() {
  const s = await readSession();
  if (!s) return NextResponse.json({ role: null, area: null });
  const access = (await getAccess()) || {};
  if (!envPin(s.role) && access[s.role] && access[s.role] !== s.hash) {
    return NextResponse.json({ role: null, area: null, invalid: true });
  }
  return NextResponse.json({ role: s.role, area: s.area });
}
