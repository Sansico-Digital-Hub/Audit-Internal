'use client';

import { useApp } from '@/components/ctx';
import { PageSkeleton } from '@/components/Skeleton';
import InputForm from '@/components/InputForm';

export default function InputProduksiPage() {
  const { loading } = useApp();
  if (loading) return <PageSkeleton />;
  return <InputForm mode="p" />;
}
