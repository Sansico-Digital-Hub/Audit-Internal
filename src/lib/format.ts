import { MONTHS, STD, WARN } from './constants';

export const fmt = (v: number | null | undefined) => (v == null ? '–' : v.toFixed(1));

export const cls = (v: number | null | undefined): 'good' | 'warn' | 'bad' | 'na' =>
  v == null ? 'na' : v >= STD ? 'good' : v >= WARN ? 'warn' : 'bad';

export const fmtW = (w: number) => +(+w).toFixed(1);

export const dateLabel = (d?: string) => {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return +dd + ' ' + MONTHS[+m - 1].slice(0, 3) + ' ' + y;
};

export const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const p2 = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());

export function weekEnd(d: string) {
  const [y, m, dd] = d.split('-').map(Number);
  const x = new Date(y, m - 1, dd);
  x.setDate(x.getDate() + ((6 - x.getDay() + 7) % 7));
  return iso(x);
}

export const wlab = (k: string) => {
  const [, m, d] = k.split('-');
  return (d === undefined ? '' : +d) + '-' + MONTHS[+m - 1].slice(0, 3);
};

export function wrapName(s: string, max: number) {
  const toks: { t: string; g: boolean }[] = [];
  s.split(' ').forEach((w) => {
    (w.length > max ? w.split(/(?<=-)/) : [w]).forEach((p, i) => toks.push({ t: p, g: i > 0 }));
  });
  const lines: string[] = [];
  let cur = '';
  toks.forEach((k) => {
    const j = cur ? (k.g ? cur + k.t : cur + ' ' + k.t) : k.t;
    if (j.length > max && cur) {
      lines.push(cur);
      cur = k.t;
    } else cur = j;
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export const periodLabel = (from: string, to: string, rangeLabel: string) => rangeLabel;

export function csvEscape(rows: (string | number | null | undefined)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? '');
            return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(','),
      )
      .join('\n')
  );
}
