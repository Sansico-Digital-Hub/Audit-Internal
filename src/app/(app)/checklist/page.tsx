'use client';

import { useApp } from '@/components/ctx';
import { PageSkeleton } from '@/components/Skeleton';
import { CustomItemsView } from '@/components/Settings';

export default function ChecklistPage() {
  const { loading } = useApp();
  if (loading) return <PageSkeleton />;
  return <CustomItemsView />;
}
