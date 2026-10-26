import { PRODUCT_SECTIONS, CUSTOM_BASE } from './constants';
import { SEED_UNITS } from './seed-data';
import type { Answer, Audit, Calc, DeptAudit, ScoreSection, Section, StoredScore, Unit } from './types';

export const nl = (n: number) => (n > CUSTOM_BASE ? 'T' + (n - CUSTOM_BASE) : String(n));

export const unitById = (id: string | undefined) => SEED_UNITS.find((u) => u.id === id);

export function unitSecs(u: Unit): Section[] {
  return u.cats.map((c, i) => ({
    k: 'c' + i,
    name: (c.group ? c.group + ' · ' : '') + c.name,
    pol: u.dept,
    w: c.w,
    from: c.from,
    to: c.to,
    extra: c.extra || [],
  }));
}

export function calc(
  ans: Record<string, Answer> = {},
  SC: Section[] = PRODUCT_SECTIONS,
  weights: Record<string, number> = {},
): Calc {
  let earned = 0;
  let wsum = 0;
  let answered = 0;
  let dm = 0;
  const secs: ScoreSection[] = SC.map((s) => {
    let m = 0;
    let d = 0;
    let na = 0;
    let wm = 0;
    let wd = 0;
    const ks: number[] = [];
    for (let n = s.from; n <= s.to; n++) ks.push(n);
    (s.extra || []).forEach((n) => ks.push(n));
    ks.forEach((n) => {
      const a = ans[n];
      const w = weights[n] ?? 1;
      if (a === 'M') {
        m++;
        wm += w;
      } else if (a === 'DM') {
        d++;
        wd += w;
      } else if (a === 'NA') na++;
    });
    const sc = wm + wd;
    const pct = sc ? wm / sc : null;
    const pts = pct == null ? null : pct * s.w;
    if (sc) {
      earned += pts as number;
      wsum += s.w;
    }
    answered += m + d + na;
    dm += d;
    return { k: s.k, name: s.name, m, d, na, pct, pts, w: s.w };
  });
  return { secs, total: wsum ? (earned / wsum) * 100 : null, answered, dm };
}

const hasAns = (a: Audit | DeptAudit) => !!a.ans && Object.keys(a.ans).length > 0;

function storedCalc(SC: Section[], sc: StoredScore): Calc {
  const secs: ScoreSection[] = SC.map((s, i) => {
    const raw = Array.isArray(sc.cats) ? sc.cats[i] : sc[s.k];
    const p = Number(raw);
    const ok = raw != null && Number.isFinite(p);
    return { k: s.k, name: s.name, m: 0, d: 0, na: 0, pct: ok && s.w ? p / s.w : null, pts: ok ? p : null, w: s.w };
  });
  return { secs, total: sc.total != null ? Number(sc.total) : null, answered: 0, dm: Number(sc.dm) || 0, imp: true };
}

export function calcOf(a: Audit | DeptAudit): Calc {
  const isDept = 'unit' in a && !!(a as DeptAudit).unit;
  const sc = (a.score || {}) as StoredScore;
  const SC = isDept ? unitSecs(unitById((a as DeptAudit).unit) || SEED_UNITS[0]) : PRODUCT_SECTIONS;
  if (hasAns(a)) {
    // Skor manual per audit mengalahkan hitungan otomatis.
    if (sc.manual) return storedCalc(SC, sc);
    return calc(a.ans, SC, sc.weights || {});
  }
  // Audit impor: skor tersimpan (tanpa jawaban per poin).
  return storedCalc(SC, sc);
}

export const withCalc = <T extends Audit | DeptAudit>(a: T): T & { c: Calc } => ({ ...a, c: calcOf(a) });

export const cmp = (
  a: { date: string; createdAt: number },
  b: { date: string; createdAt: number },
) => ((a.date + String(1e13 + (a.createdAt || 0))) > (b.date + String(1e13 + (b.createdAt || 0))) ? 1 : -1);

export const inSec = (i: { n: number }, s: Section) =>
  (i.n >= s.from && i.n <= s.to) || (s.extra || []).includes(i.n);
