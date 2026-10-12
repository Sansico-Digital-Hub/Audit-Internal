// Impor hasil audit dari referensi/Hasil audit internal.xlsx ke aplikasi
// (via API aplikasi — login admin). Data di xlsx berupa SKOR agregat per
// seksi/kategori per minggu, jadi disimpan sebagai audit "imported" (field score).
//
//   node scripts/import-xlsx.mjs
//   IMPORT_BASE=https://audit-qc.sansico.cloud node scripts/import-xlsx.mjs
//
import fs from 'node:fs';
import XLSX from 'xlsx';

const BASE = process.env.IMPORT_BASE || 'http://localhost:3000';
const PIN = process.env.IMPORT_PIN || '123098';
const XLSX_PATH = process.env.XLSX_PATH || 'referensi/Hasil audit internal.xlsx';
const HTML_PATH = 'referensi/Audit_Internal_Produksi_TERBARU_v5.html';

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, aug: 8, ags: 8, sep: 9, sept: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };
function monthNum(m) {
  m = String(m).toLowerCase();
  for (const k of Object.keys(MON)) if (m.startsWith(k)) return MON[k];
  return 0;
}
function parseDate(v) {
  v = String(v).trim();
  if (!v) return null;
  let m;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return iso(new Date(y, +m[1] - 1, +m[2]));
  }
  if ((m = v.match(/^(\d{1,2})\s*[- ]\s*([A-Za-z]+)$/))) {
    const mo = monthNum(m[2]);
    return mo ? iso(new Date(2026, mo - 1, +m[1])) : null;
  }
  if ((m = v.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/))) {
    const mo = monthNum(m[1]);
    return mo ? iso(new Date(+m[3], mo - 1, +m[2])) : null;
  }
  return null;
}
const num = (v) => {
  if (v == null) return null;
  const s = String(v).replace(/[^0-9.-]/g, '');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const norm = (s) => String(s).toLowerCase().replace(/accuracy/g, 'akurasi').replace(/[^a-z0-9]/g, '');
const matchCat = (header, cat) => {
  const h = norm(header);
  const c = norm(cat);
  if (!h || !c) return false;
  return h === c || h.includes(c) || c.includes(h);
};

// --- baca UNITS dari referensi (kategori + bobot) ---
function readUnits() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const i = html.indexOf('const UNITS = ');
  const j = html.indexOf('\nconst SECS = ', i);
  const units = JSON.parse(html.slice(i + 'const UNITS = '.length, j).trim().replace(/;$/, ''));
  return units.map((u) => ({ id: u.id, name: u.name, dept: u.dept, cats: u.cats.map((c) => ({ name: c.name, w: c.w, group: c.group })) }));
}

let cookie = '';
async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  return r;
}

const wb = XLSX.readFile(XLSX_PATH);
const grid = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
const units = readUnits();
const unitById = (id) => units.find((u) => u.id === id);

// login + ambil area
const lr = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ role: 'admin', pin: PIN }) });
if (!lr.ok) {
  console.error('login gagal:', lr.status, await lr.text());
  process.exit(1);
}
const cfg = await (await req('/api/config')).json();
const areas = cfg.areas;
const areaByName = (name) => areas.find((a) => norm(a.name) === norm(name));

let postedP = 0, skipP = 0;

// --- 1) hasil audit produksi ---
{
  const g = grid('Hasil audit produksi');
  const header = g[0].map((h) => norm(h));
  const ci = { product: header.findIndex((h) => h === 'product'), process: header.findIndex((h) => h === 'process'), system: header.findIndex((h) => h === 'system'), area: header.findIndex((h) => h === 'areakerja'), total: header.findIndex((h) => h.includes('processscore')) };
  for (let r = 1; r < g.length; r++) {
    const row = g[r];
    const date = parseDate(row[0]);
    const areaName = String(row[1]).replace(/^\s*\d+\.\s*/, '').trim();
    const area = areaByName(areaName);
    if (!date || !area) { skipP++; continue; }
    const score = { product: num(row[ci.product]), process: num(row[ci.process]), system: num(row[ci.system]), area: num(row[ci.area]), total: num(row[ci.total]), dm: 0 };
    const body = { id: `imp_p_${date}_${area.id}`, date, areaId: area.id, areaName: area.name, auditor: 'Impor Data', auditee: '-', ans: {}, finds: {}, score, createdAt: Date.now() };
    const rr = await req('/api/audits', { method: 'POST', body: JSON.stringify(body) });
    if (rr.ok) postedP++; else skipP++;
  }
}
console.log(`produksi: posted=${postedP} skip=${skipP}`);

// --- 2) hasil audit departemen ---
const DEPT = [
  { sheet: 'Hasil audit WH IM', unit: 'd1' },
  { sheet: 'Hasil audit WH packaging', unit: 'd2' },
  { sheet: 'Hasil audit raw material', unit: 'd3' },
  { sheet: 'Hasil audit QC', unit: 'd4' },
  { sheet: 'Hasil Audit PE', unit: 'd5' },
  { sheet: 'Hasil audit Maintenance', unit: 'd6' },
  { sheet: 'Hasil audit IE', unit: 'd7' },
  { sheet: 'Hasil audit Rak WIP', unit: 'd8' },
];
let postedD = 0;
for (const { sheet, unit } of DEPT) {
  const g = grid(sheet);
  const u = unitById(unit);
  if (!u) continue;
  // baris data pertama = yang kolom 0-nya berhasil di-parse tanggal
  let d0 = 0;
  for (let r = 0; r < g.length; r++) {
    if (parseDate(g[r][0])) { d0 = r; break; }
  }
  const catRow = g[d0 - 1] || [];
  const hdrRow = g[0] || [];
  // kolom total (overall / score), bukan standar
  const findTotal = (row) => row.findIndex((h) => { const n = norm(h); return n.includes('overallscore') || n === 'score' || n === 'overall'; });
  let totalCol = findTotal(hdrRow);
  if (totalCol < 0) totalCol = findTotal(catRow);

  let n = 0;
  for (let r = d0; r < g.length; r++) {
    const row = g[r];
    const date = parseDate(row[0]);
    if (!date) continue;
    const cats = u.cats.map((c) => {
      for (let j = 0; j < catRow.length; j++) {
        if (j === totalCol) continue;
        if (matchCat(catRow[j], c.name)) return num(row[j]);
      }
      return null;
    });
    const total = totalCol >= 0 ? num(row[totalCol]) : (cats.some((x) => x != null) ? null : null);
    const body = { id: `imp_d_${date}_${unit}`, unit, unitName: u.name, dept: u.dept, date, auditor: 'Impor Data', auditee: '-', ans: {}, finds: {}, score: { total, dm: 0, cats }, createdAt: Date.now() };
    const rr = await req('/api/daudits', { method: 'POST', body: JSON.stringify(body) });
    if (rr.ok) { postedD++; n++; }
  }
  console.log(`  ${sheet} (${unit}): posted=${n}`);
}
console.log(`departemen: posted=${postedD}`);

const a = await (await req('/api/audits')).json();
const d = await (await req('/api/daudits')).json();
console.log('total online -> audits:', a.length, 'daudits:', d.length);
