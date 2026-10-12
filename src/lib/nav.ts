import type { Role } from './types';

export interface NavChild {
  href: string;
  label: string;
}
export interface NavLink {
  href: string;
  label: string;
  children?: NavChild[];
}

const ALL: Record<string, NavLink> = {
  dashboard: { href: '/dashboard', label: 'Dashboard Produksi' },
  departemen: { href: '/departemen', label: 'Dashboard Departemen' },
  temuan: { href: '/temuan', label: 'Temuan' },
  input: {
    href: '/input',
    label: 'Input Audit',
    children: [
      { href: '/input/produksi', label: 'Produksi' },
      { href: '/input/departemen', label: 'Departemen lain' },
    ],
  },
  riwayat: { href: '/riwayat', label: 'Riwayat' },
  area: { href: '/area', label: 'Area' },
  checklist: { href: '/checklist', label: 'Poin Checklist' },
  akses: { href: '/akses', label: 'Akses' },
};

export function linksFor(role: Role | undefined, isDept: boolean): NavLink[] {
  if (role === 'prod')
    return isDept
      ? [{ href: '/departemen', label: 'Tren Unit' }, { href: '/temuan', label: 'Action Plan' }]
      : [{ href: '/dashboard', label: 'Tren Area' }, { href: '/temuan', label: 'Action Plan' }];
  if (role === 'auditor')
    return [ALL.input, ALL.dashboard, ALL.departemen, ALL.temuan, ALL.riwayat, ALL.area];
  if (role === 'admin')
    return [ALL.dashboard, ALL.departemen, ALL.temuan, ALL.input, ALL.riwayat, ALL.area, ALL.checklist, ALL.akses];
  return [];
}

export function defaultPath(role: Role | undefined, isDept: boolean): string {
  if (role === 'prod') return isDept ? '/departemen' : '/dashboard';
  if (role === 'auditor') return '/input/produksi';
  return '/dashboard';
}

export function allowedPaths(role: Role | undefined): string[] {
  if (role === 'admin') return ['/dashboard', '/departemen', '/temuan', '/input', '/riwayat', '/area', '/checklist', '/akses'];
  if (role === 'auditor') return ['/input', '/dashboard', '/departemen', '/temuan', '/riwayat', '/area'];
  if (role === 'prod') return ['/dashboard', '/departemen', '/temuan'];
  return [];
}
