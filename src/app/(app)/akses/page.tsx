'use client';

import { useApp } from '@/components/ctx';
import { PageSkeleton } from '@/components/Skeleton';
import { AccessView } from '@/components/Settings';

export default function AksesPage() {
  const { loading } = useApp();
  if (loading) return <PageSkeleton />;
  return <AccessView />;
}
