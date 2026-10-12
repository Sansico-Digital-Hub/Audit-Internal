'use client';

import { useApp } from '@/components/ctx';
import { PageSkeleton } from '@/components/Skeleton';
import { AreasView } from '@/components/Settings';

export default function AreaPage() {
  const { areas, refresh, loading } = useApp();
  if (loading) return <PageSkeleton />;
  return <AreasView areas={areas} reload={refresh} />;
}
