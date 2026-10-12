'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import { PageSkeleton } from '@/components/Skeleton';
import Findings from '@/components/Findings';

export default function TemuanPage() {
  const { audits, daudits, refresh, loading } = useApp();
  const filters = useFilters();
  if (loading) return <PageSkeleton />;
  return <Findings audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
