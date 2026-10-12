import { csvEscape } from './format';
import { calcOf, cmp, nl } from './scoring';
import { PRODUCT_SECTIONS } from './constants';
import type { Audit, DeptAudit } from './types';

export function csvScores(audits: Audit[], resolveArea: (id: string) => string) {
  const rows: (string | number)[][] = [
    ['Tanggal', 'Area', 'Auditor', 'Auditee', ...PRODUCT_SECTIONS.map((s) => `${s.name} (${s.w})`), 'Skor total', 'Jumlah DM'],
  ];
  audits
    .map((a) => ({ a, c: calcOf(a) }))
    .sort((x, y) => cmp(x.a, y.a))
    .forEach(({ a, c }) =>
      rows.push([
        a.date,
        a.areaName || resolveArea(a.areaId),
        a.auditor,
        a.auditee,
        ...c.secs.map((s) => (s.pts == null ? '' : s.pts.toFixed(2))),
        c.total == null ? '' : c.total.toFixed(2),
        c.dm,
      ]),
    );
  return csvEscape(rows);
}

export function csvDept(daudits: DeptAudit[], resolveUnit: (id: string) => string) {
  const rows: (string | number)[][] = [['Tanggal', 'Departemen', 'Unit', 'Auditor', 'Auditee', 'Skor total', 'Jumlah DM']];
  daudits
    .slice()
    .sort(cmp)
    .forEach((a) => {
      const c = calcOf(a);
      rows.push([a.date, a.dept || '', a.unitName || resolveUnit(a.unit), a.auditor, a.auditee, c.total != null ? c.total.toFixed(2) : '', c.dm]);
    });
  return csvEscape(rows);
}

export interface FindingExportRow {
  date: string;
  area: string;
  n: number;
  t: string;
  finding: string;
  plan?: string;
  pic?: string;
  due?: string;
  status?: string;
  photos?: string[];
  donePhotos?: string[];
  closedAt?: string;
}

export function csvFinds(rowsIn: FindingExportRow[]) {
  const rows: (string | number)[][] = [
    ['Tanggal', 'Area', 'No', 'Poin audit', 'Temuan', 'Action plan', 'PIC', 'Due date', 'Status', 'Jumlah foto temuan', 'Jumlah bukti action plan', 'Tanggal closed'],
  ];
  rowsIn.forEach((x) =>
    rows.push([
      x.date,
      x.area,
      nl(x.n),
      x.t,
      x.finding,
      x.plan || '',
      x.pic || '',
      x.due || '',
      x.status || 'Open',
      (x.photos || []).length,
      (x.donePhotos || []).length,
      x.closedAt || '',
    ]),
  );
  return csvEscape(rows);
}
