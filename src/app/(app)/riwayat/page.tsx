'use client';

import { useApp } from '@/components/ctx';
import { PageSkeleton } from '@/components/Skeleton';
import History from '@/components/History';

export default function RiwayatPage() {
  const { audits, daudits, refresh, loading } = useApp();
  if (loading) return <PageSkeleton />;
  return <History audits={audits} daudits={daudits} reload={refresh} />;
}
