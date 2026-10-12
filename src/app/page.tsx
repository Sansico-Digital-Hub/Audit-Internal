import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { defaultPath } from '@/lib/nav';

export const instant = false;

export default async function Home() {
  const s = await readSession();
  if (!s) redirect('/login');
  redirect(defaultPath(s.role, /^d/.test(s.area || '')));
}
