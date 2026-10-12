'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import { DeptDashboard } from '@/components/Dash';

export default function DepartemenPage() {
  const { audits, daudits, refresh } = useApp();
  const filters = useFilters();
  return <DeptDashboard audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
