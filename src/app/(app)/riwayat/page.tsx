'use client';

import { useApp } from '@/components/ctx';
import History from '@/components/History';

export default function RiwayatPage() {
  const { audits, daudits, refresh } = useApp();
  return <History audits={audits} daudits={daudits} reload={refresh} />;
}
