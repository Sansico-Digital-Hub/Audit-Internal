'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import { PageSkeleton } from '@/components/Skeleton';
import { DeptDashboard } from '@/components/Dash';

export default function DepartemenPage() {
  const { audits, daudits, refresh, loading } = useApp();
  const filters = useFilters();
  if (loading) return <PageSkeleton />;
  return <DeptDashboard audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
