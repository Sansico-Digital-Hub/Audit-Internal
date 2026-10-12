import type { Section } from './types';

export const PRODUCT_SECTIONS: Section[] = [
  { k: 'product', name: 'Product', pol: 'Quality at source', w: 19, from: 1, to: 6 },
  { k: 'process', name: 'Process', pol: 'Quality at source', w: 31, from: 7, to: 20 },
  { k: 'system', name: 'System', pol: 'Quality at source', w: 25, from: 21, to: 28 },
  { k: 'area', name: 'Area Kerja', pol: '5R', w: 25, from: 29, to: 39 },
];

export const STD = 95;
export const WARN = 85;
export const MAXPH = 4;
export const MAXPH_ACTION = 8;
export const CUSTOM_BASE = 1000;

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const STATUSES = ['Open', 'Progress', 'Closed'] as const;

export const ROLE_LABEL: Record<string, string> = {
  prod: 'Produksi / Departemen',
  auditor: 'Auditor',
  admin: 'Admin',
};
