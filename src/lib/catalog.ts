import { PRODUCT_SECTIONS, CUSTOM_BASE } from './constants';
import { SEED_ITEMS, SEED_UNITS } from './seed-data';
import type { CustomItem, Item, Section, Unit } from './types';

export interface Catalog {
  items: Item[];
  units: Unit[];
  sections: Section[];
  custom: CustomItem[];
}

export function buildCatalog(custom: CustomItem[] = []): Catalog {
  const items: Item[] = SEED_ITEMS.map((i) => ({ ...i }));
  const sections: Section[] = PRODUCT_SECTIONS.map((s) => ({ ...s, extra: [] as number[] }));
  const units: Unit[] = SEED_UNITS.map((u) => ({
    ...u,
    cats: u.cats.map((c) => ({ ...c, extra: [] as number[] })),
    items: u.items.map((i) => ({ ...i })),
  }));

  custom.forEach((e) => {
    if (!e || !Number.isInteger(e.n) || e.n <= CUSTOM_BASE || !String(e.t || '').trim()) return;
    const it: Item = { n: e.n, t: String(e.t), r: String(e.r || ''), custom: true, off: e.active === false };
    if (e.scope === 'p') {
      const s = sections.find((x) => x.k === e.sec);
      if (!s) return;
      items.push(it);
      (s.extra as number[]).push(e.n);
    } else {
      const u = units.find((x) => x.id === e.scope);
      const ci = /^c\d+$/.test(String(e.sec)) ? +String(e.sec).slice(1) : -1;
      if (!u || !u.cats[ci]) return;
      u.items.push(it);
      (u.cats[ci].extra as number[]).push(e.n);
    }
  });

  return { items, units, sections, custom };
}

export function clSecOpts(catalog: Catalog, scope: string): [string, string][] {
  if (scope === 'p') return catalog.sections.map((s) => [s.k, `${s.name} (bobot ${s.w})`]);
  const u = catalog.units.find((x) => x.id === scope);
  if (!u) return [];
  return u.cats.map((c, i) => {
    const w = +(+c.w).toFixed(1);
    return ['c' + i, `${c.group ? c.group + ' · ' : ''}${c.name} (bobot ${w})`];
  });
}

export function clLabel(catalog: Catalog, e: CustomItem): string {
  if (e.scope === 'p') {
    const s = catalog.sections.find((x) => x.k === e.sec);
    return 'Produksi · ' + (s ? s.name : '?');
  }
  const u = catalog.units.find((x) => x.id === e.scope);
  if (!u) return '?';
  const o = clSecOpts(catalog, e.scope).find((x) => x[0] === e.sec);
  return u.dept + ' · ' + u.name + ' · ' + (o ? o[1].replace(/ \(bobot.*$/, '') : '?');
}
