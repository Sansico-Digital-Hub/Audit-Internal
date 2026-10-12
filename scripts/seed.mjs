// Seed database dari data referensi (referensi/Audit_Internal_Produksi_TERBARU_v5.html).
// - Menyalin daftar area referensi ke config.areas (bila belum ada).
// - Mengisi contoh data audit produksi & departemen agar dashboard/history berisi.
// Idempotent: aman dijalankan berulang (id tetap, ON CONFLICT DO NOTHING).
//
//   npm run db:seed
//
import fs from 'node:fs';
import postgres from 'postgres';

for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* ignore */
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL belum diset (.env).');
  process.exit(1);
}

const FALLBACK = {
  areas: ['Sheeter', 'Printing', 'DC-HS Baoder', 'Silk Screen-Proofing', 'Varnish Offline', 'FG Depan', 'Join Manual', 'Laminating-UV', 'PH-HF', 'Sealing', 'WP', 'HF Auto', 'VF', 'IM', 'WP He Li', 'Sheeter PET', 'Line Belakang'],
  units: [
    { id: 'd1', name: 'Finished Good IM', dept: 'Logistic' },
    { id: 'd2', name: 'Finished Good Packaging', dept: 'Logistic' },
    { id: 'd3', name: 'Raw Material', dept: 'Logistic' },
    { id: 'd4', name: 'QC', dept: 'Quality' },
    { id: 'd5', name: 'PE', dept: 'Product Engineering' },
    { id: 'd6', name: 'Maintenance', dept: 'Maintenance' },
    { id: 'd7', name: 'IE', dept: 'IE' },
    { id: 'd8', name: 'WIP PC', dept: 'WIP Process Control' },
  ],
};

function readReference() {
  const p = 'referensi/Audit_Internal_Produksi_TERBARU_v5.html';
  if (!fs.existsSync(p)) return FALLBACK;
  try {
    const html = fs.readFileSync(p, 'utf8');
    const grab = (a, b) => {
      const i = html.indexOf(a);
      const j = html.indexOf(b, i);
      return html.slice(i + a.length, j).trim().replace(/;$/, '').trim();
    };
    const am = html.match(/const DEFAULT_AREAS = \[([\s\S]*?)\]\.map/);
    const areas = am ? [...am[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
    const units = JSON.parse(grab('const UNITS = ', '\nconst SECS = ')).map((u) => ({ id: u.id, name: u.name, dept: u.dept }));
    return {
      areas: areas.length ? areas : FALLBACK.areas,
      units: units.length ? units : FALLBACK.units,
    };
  } catch {
    return FALLBACK;
  }
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

const ref = readReference();
const areaRows = ref.areas.map((name, i) => ({ id: 'a' + (i + 1), name }));
const dmSets = [[9, 18], [4, 27, 33], [12], [9, 22], [], [31, 34, 36], [16], [9, 25], [], [2, 18, 39]];

const sql = postgres(url, { max: 2 });
let insertedP = 0;
let insertedD = 0;

try {
  // 1) area -> config
  const existing = await sql`select value from config where key = 'areas'`;
  const hasList = existing.length && Array.isArray(existing[0].value?.list) && existing[0].value.list.length;
  if (!hasList) {
    await sql`insert into config (key, value, updated_at)
      values ('areas', ${sql.json({ list: areaRows })}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
    console.log(`[seed] config.areas diisi ${areaRows.length} area (dari referensi)`);
  } else {
    console.log(`[seed] config.areas sudah ada (${existing[0].value.list.length} area) — dilewati`);
  }

  // 2) audit produksi -> audits
  for (let w = 0; w < 5; w++) {
    for (let ai = 0; ai < areaRows.length && ai < 14; ai++) {
      if ((ai + w) % 3 === 2) continue;
      const id = `seed_p_${w}_${areaRows[ai].id}`;
      const dm = dmSets[(ai + w) % dmSets.length];
      const ans = {};
      for (let n = 1; n <= 39; n++) ans[n] = dm.includes(n) ? 'DM' : 'M';
      if ((ai + w) % 7 === 0) ans[5] = 'NA';
      const finds = {};
      dm.forEach((n) => (finds[n] = { finding: `Temuan pada poin ${n}: kondisi tidak sesuai acuan.`, plan: '', pic: 'Budi', due: daysAgo(-8), status: w === 1 ? 'Closed' : 'Open', photos: [], donePhotos: [] }));
      const r = await sql`insert into audits (id, date, area_id, area_name, auditor, auditee, ans, finds, score, created_at)
        values (${id}, ${daysAgo(w * 7 + 1)}, ${areaRows[ai].id}, ${areaRows[ai].name}, ${'Demo Auditor'}, ${'Demo Auditee'}, ${sql.json(ans)}, ${sql.json(finds)}, ${null}, ${Date.now() - w})
        on conflict (id) do nothing`;
      insertedP += r.count ?? 0;
    }
  }

  // 3) audit departemen -> dept_audits
  for (let w = 0; w < 4; w++) {
    for (const u of ref.units) {
      const id = `seed_d_${w}_${u.id}`;
      const dm = w % 2 === 0 ? [1, 5] : [2];
      const ans = {};
      for (let n = 1; n <= 34; n++) ans[n] = dm.includes(n) ? 'DM' : 'M';
      const finds = {};
      dm.forEach((n) => (finds[n] = { finding: `Temuan unit ${u.name} poin ${n}.`, plan: '', pic: 'Ayu', due: daysAgo(-5), status: 'Open', photos: [], donePhotos: [] }));
      const r = await sql`insert into dept_audits (id, unit, unit_name, dept, date, auditor, auditee, ans, finds, score, created_at)
        values (${id}, ${u.id}, ${u.name}, ${u.dept}, ${daysAgo(w * 7 + 2)}, ${'Demo Auditor'}, ${'Demo Auditee'}, ${sql.json(ans)}, ${sql.json(finds)}, ${null}, ${Date.now() - w})
        on conflict (id) do nothing`;
      insertedD += r.count ?? 0;
    }
  }

  console.log(`[seed] audit produksi ditambahkan: ${insertedP}`);
  console.log(`[seed] audit departemen ditambahkan: ${insertedD}`);
  console.log('[seed] selesai');
} catch (e) {
  console.error('[seed] gagal:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
