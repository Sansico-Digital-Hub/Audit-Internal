import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import Shell from '@/components/Shell';

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const s = await readSession();
  if (!s) redirect('/login');
  return <Shell initialSession={{ role: s.role, area: s.area }}>{children}</Shell>;
}
