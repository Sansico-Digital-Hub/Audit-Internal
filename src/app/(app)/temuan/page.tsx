'use client';

import { useApp } from '@/components/ctx';
import { useFilters } from '@/components/useFilters';
import Findings from '@/components/Findings';

export default function TemuanPage() {
  const { audits, daudits, refresh } = useApp();
  const filters = useFilters();
  return <Findings audits={audits} daudits={daudits} filters={filters} reload={refresh} />;
}
