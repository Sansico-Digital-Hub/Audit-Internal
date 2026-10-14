'use client';

import { createContext, useContext } from 'react';
import type { Catalog } from '@/lib/catalog';
import type { Audit, CustomItem, DeptAudit, Role } from '@/lib/types';

export interface Session {
  role: Role;
  area: string | null;
}

export interface AppCtxType {
  catalog: Catalog;
  session: Session | null;
  areas: { id: string; name: string }[];
  access: { prod: boolean; auditor: boolean; admin: boolean };
  envManaged: { prod: boolean; auditor: boolean; admin: boolean };
  scopePins: Record<string, boolean>;
  setup: boolean;
  audits: Audit[];
  daudits: DeptAudit[];
  loading: boolean;
  openCount: number;
  toast: (m: string) => void;
  openPhoto: (src: string) => void;
  refresh: () => void;
  logout: () => Promise<void>;
}

export const AppCtx = createContext<AppCtxType | null>(null);

export function useApp(): AppCtxType {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppCtx missing');
  return c;
}

export type { CustomItem };
