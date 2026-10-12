import { MONTHS } from './constants';
import { dateLabel, iso, weekEnd, wlab } from './format';
import { cmp } from './scoring';
import type { Audit, DeptAudit } from './types';

export function latestByArea<T extends { areaId: string; date: string; createdAt: number }>(
  list: T[],
): Record<string, T> {
  const m: Record<string, T> = {};
  list.forEach((a) => {
    const c = m[a.areaId];
    if (!c || cmp(c, a) < 0) m[a.areaId] = a;
  });
  return m;
}

export function byWeek(list: Audit[]) {
  const map: Record<string, Record<string, Audit>> = {};
  list.forEach((a) => {
    const w = weekEnd(a.date);
    const r = (map[w] = map[w] || {});
    const c = r[a.areaId];
    if (!c || cmp(c, a) < 0) r[a.areaId] = a;
  });
  return { weeks: Object.keys(map).sort(), map };
}

export const pKey = (d: string, gran: 'week' | 'month') => (gran === 'month' ? d.slice(0, 7) : weekEnd(d));
export const pLab = (k: string, gran: 'week' | 'month') =>
  gran === 'month' ? MONTHS[+k.slice(5, 7) - 1].slice(0, 3) + ' ' + k.slice(2, 4) : wlab(k);

export function presetRange(p: string): { from: string; to: string } {
  const d = new Date();
  if (p === '4w' || p === '8w') {
    d.setDate(d.getDate() - (p === '4w' ? 27 : 55));
    return { from: iso(d), to: '' };
  }
  if (p === 'month') {
    return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: '' };
  }
  return { from: '', to: '' };
}

export const rangeLabel = (from: string, to: string) =>
  !from && !to ? 'semua audit' : `${from ? dateLabel(from) : 'awal'} sampai ${to ? dateLabel(to) : 'sekarang'}`;

export const filterByRange = <T extends { date: string }>(list: T[], from: string, to: string) =>
  list.filter((a) => (!from || a.date >= from) && (!to || a.date <= to));

export const openCounts = (audits: Audit[], daudits: DeptAudit[]) => {
  let c = 0;
  [...audits, ...daudits].forEach((a) =>
    Object.values(a.finds || {}).forEach((f: { status?: string }) => {
      if ((f.status || 'Open') !== 'Closed') c++;
    }),
  );
  return c;
};
