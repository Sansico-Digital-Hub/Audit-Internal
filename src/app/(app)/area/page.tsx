'use client';

import { useApp } from '@/components/ctx';
import { AreasView } from '@/components/Settings';

export default function AreaPage() {
  const { areas, refresh } = useApp();
  return <AreasView areas={areas} reload={refresh} />;
}
