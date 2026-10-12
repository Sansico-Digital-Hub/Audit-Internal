'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import { PageSkeleton } from '@/components/Skeleton';
import { ProdDashboard } from '@/components/Dash';

export default function DashboardPage() {
  const { audits, daudits, refresh, loading } = useApp();
  const filters = useFilters();
  if (loading) return <PageSkeleton />;
  return <ProdDashboard audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
