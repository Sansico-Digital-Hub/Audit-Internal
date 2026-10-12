'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import { ProdDashboard } from '@/components/Dash';

export default function DashboardPage() {
  const { audits, daudits, refresh } = useApp();
  const filters = useFilters();
  return <ProdDashboard audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
