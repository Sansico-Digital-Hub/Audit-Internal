'use client';

import { useState } from 'react';

export interface Filters {
  from: string;
  to: string;
  preset: string;
  weeks: number;
  gran: 'week' | 'month';
  dunit: string;
  trendArea: string;
  fstatus: string;
  farea: string;
  set: (patch: Partial<Omit<Filters, 'set'>>) => void;
}

export function useFilters(): Filters {
  const [f, setF] = useState({
    from: '',
    to: '',
    preset: 'all',
    weeks: 2,
    gran: 'week' as 'week' | 'month',
    dunit: 'all',
    trendArea: 'all',
    fstatus: 'open',
    farea: 'all',
  });
  return { ...f, set: (patch) => setF((prev) => ({ ...prev, ...patch })) };
}
