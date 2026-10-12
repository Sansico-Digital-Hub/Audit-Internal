'use client';

import { useEffect, useState } from 'react';
import { useApp } from './ctx';
import type { Filters } from './useFilters';
import { BarSeries, ChartA, Hbars, SectionLegend, StdBarLegend } from './charts';
import { STD, WARN } from '@/lib/constants';
import { csvDept, csvScores } from '@/lib/csv';
import { byWeek, filterByRange, latestByArea, pKey, pLab, presetRange, rangeLabel } from '@/lib/derive';
import { download } from '@/lib/client';
import { cls, dateLabel, fmt, today, wlab } from '@/lib/format';
import { calcOf, cmp, nl, unitById, withCalc } from '@/lib/scoring';
import type { Audit, Calc, DeptAudit, Section, Unit } from '@/lib/types';

function useWide(min = 900) {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= min);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [min]);
  return wide;
}

function RangeControls({ filters, extra }: { filters: Filters; extra?: React.ReactNode }) {
  const { from, to, preset, set } = filters;
  return (
    <div className="ctrl">
      <label className="f">
        Dari
        <input type="date" value={from} onChange={(e) => set({ from: e.target.value, preset: 'custom' })} />
      </label>
      <label className="f">
        Sampai
        <input type="date" value={to} onChange={(e) => set({ to: e.target.value, preset: 'custom' })} />
      </label>
      <div className="chips" style={{ alignSelf: 'end', paddingBottom: 2 }}>
        {[['all', 'Semua'], ['4w', '4 minggu'], ['8w', '8 minggu'], ['month', 'Bulan ini']].map(([k, l]) => (
          <button
            key={k}
            type="button"
            className="btn ghost sm"
            aria-pressed={preset === k}
            onClick={() => set({ ...presetRange(k), preset: k })}
          >
            {l}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
}

function CompPanel({ done, sections }: { done: { a: { name: string }; au: Audit & { c: Calc } }[]; sections: Section[] }) {
  if (!done.length) return <div className="empty">Belum ada data.</div>;
  return (
    <div className="rows">
      {sections.map((s, i) => {
        const vals = done.map((r) => r.au.c.secs[i]).filter((x) => x.pct != null);
        const p = vals.length ? (vals.reduce((a, x) => a + (x.pct as number), 0) / vals.length) * 100 : null;
        const worst = done
          .filter((r) => r.au.c.secs[i].pct != null)
          .sort((a, b) => (a.au.c.secs[i].pct as number) - (b.au.c.secs[i].pct as number))[0];
        return (
          <div key={s.k}>
            <div className="rrow">
              <div className="nm">
                <b>{s.name}</b> <span className="muted">bobot {s.w}</span>
              </div>
              <span className={`pill ${cls(p)}`}>{p == null ? '–' : p.toFixed(1) + '%'}</span>
            </div>
            <div className="rrow">
              <div className="track" style={{ background: 'var(--surface2)' }}>
                <i style={{ width: `${p || 0}%`, background: `var(--${cls(p)}-fill)` }} />
              </div>
            </div>
            {worst && (worst.au.c.secs[i].pct as number) < 1 && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Terendah: {worst.a.name} ({((worst.au.c.secs[i].pct as number) * 100).toFixed(0)}%)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopFind({ list, resolveArea }: { list: Audit[]; resolveArea: (id: string) => string }) {
  const { catalog } = useApp();
  const cnt: Record<string, { c: number; areas: Set<string> }> = {};
  list.forEach((a) =>
    (a.ans ? Object.keys(a.ans).filter((n) => a.ans[n] === 'DM') : Object.keys(a.finds || {})).forEach((n) => {
      (cnt[n] = cnt[n] || { c: 0, areas: new Set() }).c++;
      cnt[n].areas.add(a.areaName || resolveArea(a.areaId));
    }),
  );
  const top = Object.entries(cnt).sort((a, b) => b[1].c - a[1].c).slice(0, 6);
  if (!top.length) return <div className="empty">Tidak ada temuan DM di periode ini.</div>;
  const max = top[0][1].c;
  return (
    <div className="rows">
      {top.map(([n, o]) => {
        const it = catalog.items.find((i) => i.n === +n);
        return (
          <div key={n}>
            <div className="rrow">
              <div className="nm">
                <b className="mono">#{nl(+n)}</b> {it ? it.t : ''}
              </div>
              <span className="pill bad">{o.c}×</span>
            </div>
            <div className="rrow">
              <div className="track">
                <i style={{ width: `${(o.c / max) * 100}%` }} />
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {[...o.areas].join(', ')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProdDashboard({
  audits,
  filters,
}: {
  audits: Audit[];
  daudits: DeptAudit[];
  filters: Filters;
  reload: () => void;
}) {
  const { catalog, session, areas } = useApp();
  const wide = useWide();
  const role = session?.role;
  const scopeArea = session?.area || '';
  const VA = role === 'prod' ? audits.filter((a) => a.areaId === scopeArea) : audits;
  const VAr = role === 'prod' ? areas.filter((a) => a.id === scopeArea) : areas;
  const periodAudits = filterByRange(VA, filters.from, filters.to);
  const sections = catalog.sections;
  const resolveArea = (id: string) => areas.find((a) => a.id === id)?.name || id;

  const lat = latestByArea(periodAudits);
  const rows = VAr.map((a) => ({ i: areas.indexOf(a), a, au: lat[a.id] ? withCalc(lat[a.id]) : null }));
  const done = rows.filter((r) => r.au && r.au.c.total != null) as { i: number; a: { id: string; name: string }; au: Audit & { c: Calc } }[];
  const avg = done.length ? done.reduce((s, r) => s + (r.au.c.total as number), 0) / done.length : null;
  const below = done.filter((r) => (r.au.c.total as number) < STD).length;
  const open = VA.reduce((n, a) => n + Object.values(a.finds || {}).filter((f) => (f.status || 'Open') !== 'Closed').length, 0);
  const overdue = VA.reduce(
    (n, a) => n + Object.values(a.finds || {}).filter((f) => (f.status || 'Open') !== 'Closed' && f.due && f.due < today()).length,
    0,
  );

  const bw = byWeek(periodAudits);
  const lastW = bw.weeks[bw.weeks.length - 1];
  const trendScope = role === 'prod' ? scopeArea : filters.trendArea;
  let trendList = periodAudits;
  if (trendScope !== 'all') trendList = trendList.filter((a) => a.areaId === trendScope);
  const tbw = byWeek(trendList);
  const ptsB = tbw.weeks.map((w) => {
    const l = Object.values(tbw.map[w] || {}).map((a) => calcOf(a).total as number);
    const v = l.reduce((a, b) => a + b, 0) / l.length;
    return { lab: wlab(w), v, tip: `WE ${wlab(w)}: ${v.toFixed(1)} (${l.length} area)` };
  });
  const ptsC = done.map((r) => ({
    name: r.a.name,
    v: r.au.c.total as number,
    tip: `${r.a.name} · ${dateLabel(r.au.date)}: ${(r.au.c.total as number).toFixed(1)}`,
  }));

  return (
    <>
      <div className="bar-top">
        <div>
          <h2>{role === 'prod' ? 'Tren Audit · ' + resolveArea(scopeArea) : 'Dashboard Monitoring'}</h2>
          <div className="muted">
            Rentang: {rangeLabel(filters.from, filters.to)}. Skor kartu dan heatmap memakai audit terbaru tiap area. Standar {STD}.
          </div>
        </div>
        <RangeControls
          filters={filters}
          extra={
            <>
              <label className="f">
                Minggu di grafik utama
                <select value={filters.weeks} onChange={(e) => filters.set({ weeks: +e.target.value })}>
                  {[2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              {role !== 'prod' && (
                <button className="btn ghost" type="button" onClick={() => download('skor-audit-internal.csv', csvScores(audits, resolveArea))}>
                  Unduh CSV skor
                </button>
              )}
            </>
          }
        />
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="lab">Rata-rata skor</span>
          <span className="val mono" style={{ color: `var(--${cls(avg)})` }}>
            {fmt(avg)}
          </span>
          <span className="sub">dari {done.length} area teraudit</span>
        </div>
        <div className="card kpi">
          <span className="lab">Area teraudit</span>
          <span className="val">
            {done.length}
            <span className="muted" style={{ fontSize: 22 }}> / {VAr.length}</span>
          </span>
          <span className="sub">{VAr.length - done.length} area belum diaudit</span>
        </div>
        <div className="card kpi">
          <span className="lab">Di bawah standar</span>
          <span className="val" style={{ color: `var(--${below ? 'bad' : 'good'})` }}>
            {below}
          </span>
          <span className="sub">area dengan skor &lt; {STD}</span>
        </div>
        <div className="card kpi">
          <span className="lab">Temuan belum closed</span>
          <span className="val" style={{ color: `var(--${open ? 'bad' : 'good'})` }}>{open}</span>
          <span className="sub">{overdue} lewat due date</span>
        </div>
      </div>

      <section className="card pnl">
        <div className="pnl-h">
          <h3>Performance Process Audit{lastW ? ' · WE ' + dateLabel(lastW) : ''}</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {filters.weeks} minggu terakhir di rentang. Angka dalam batang = poin komponen. Latar merah muda = skor terbaru di bawah {WARN}.
          </span>
        </div>
        <SectionLegend sections={sections} />
        <div className="scroll">
          <ChartA list={periodAudits} areas={VAr} sections={sections} weeks={filters.weeks} wide={wide} />
        </div>
      </section>

      {role === 'prod' ? (
        <section className="card pnl">
          <div className="pnl-h">
            <h3>Overall score per minggu</h3>
            <span className="muted" style={{ fontSize: 12 }}>sumbu mulai dari 60</span>
          </div>
          <StdBarLegend />
          <div className="scroll">
            <BarSeries pts={ptsB} aria="Skor audit rata-rata per minggu" />
          </div>
        </section>
      ) : (
        <div className="grid2">
          <section className="card pnl">
            <div className="pnl-h">
              <h3>Overall score per minggu</h3>
              <label className="f" style={{ minWidth: 180 }}>
                <select value={filters.trendArea} onChange={(e) => filters.set({ trendArea: e.target.value })}>
                  <option value="all">Rata-rata semua area</option>
                  {VAr.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <StdBarLegend />
            <div className="scroll">
              <BarSeries pts={ptsB} aria="Skor audit rata-rata per minggu" />
            </div>
          </section>
          <section className="card pnl">
            <div className="pnl-h">
              <h3>Skor terbaru per area</h3>
              <span className="muted" style={{ fontSize: 12 }}>sumbu mulai dari 60</span>
            </div>
            <StdBarLegend />
            <Hbars rows={ptsC} aria="Skor audit terbaru per area" />
          </section>
        </div>
      )}

      <section className="card pnl">
        <div className="pnl-h">
          <h3>Skor per area dan komponen</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            % = capaian komponen (M ÷ M+DM). Warna: hijau ≥ {STD}, kuning ≥ {WARN}, merah di bawahnya.
          </span>
        </div>
        <div className="scroll">
          <table className="hm">
            <thead>
              <tr>
                <th>Area</th>
                {sections.map((s) => (
                  <th className="n" key={s.k}>
                    {s.name}
                  </th>
                ))}
                <th>Skor</th>
                <th className="n">DM</th>
                <th>Tgl audit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                if (!r.au)
                  return (
                    <tr key={r.a.id}>
                      <td>
                        <b>{r.i + 1}.</b> {r.a.name}
                      </td>
                      {sections.map((s) => (
                        <td className="c na" key={s.k}>
                          –
                        </td>
                      ))}
                      <td colSpan={3}>
                        <span className="pill na">Belum diaudit</span>
                      </td>
                    </tr>
                  );
                const c = r.au.c;
                return (
                  <tr key={r.a.id}>
                    <td>
                      <b>{r.i + 1}.</b> {r.a.name}
                      <div className="muted" style={{ fontSize: 12 }}>{r.au.auditor}</div>
                    </td>
                    {c.secs.map((s) => {
                      const p = s.pct == null ? null : s.pct * 100;
                      return (
                        <td className={`c ${cls(p)}`} key={s.k}>
                          {p == null ? '–' : p.toFixed(0) + '%'}
                        </td>
                      );
                    })}
                    <td>
                      <div className="tot">
                        <span className="mono" style={{ minWidth: 42 }}>{fmt(c.total)}</span>
                        <span className="tb">
                          <i className={cls(c.total)} style={{ width: `${Math.max(0, Math.min(100, c.total as number))}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="n mono">{c.dm}</td>
                    <td className="muted">{dateLabel(r.au.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.filter((r) => !r.au).length > 0 && (
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Belum diaudit di periode ini</div>
            <div className="chips">
              {rows.filter((r) => !r.au).map((r) => (
                <span className="chip" key={r.a.id}>
                  {r.i + 1}. {r.a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid2">
        <section className="card pnl">
          <div className="pnl-h">
            <h3>Capaian per komponen</h3>
          </div>
          <CompPanel done={done} sections={sections} />
        </section>
        <section className="card pnl">
          <div className="pnl-h">
            <h3>Poin yang paling sering temuan</h3>
            <span className="muted" style={{ fontSize: 12 }}>{rangeLabel(filters.from, filters.to)}</span>
          </div>
          <TopFind list={periodAudits} resolveArea={resolveArea} />
        </section>
      </div>

      {role === 'prod' && <Recent audits={VA} />}
    </>
  );
}

function Recent({ audits }: { audits: Audit[] }) {
  const l = audits.map(withCalc).sort((a, b) => -cmp(a, b)).slice(0, 8);
  return (
    <section className="card pnl">
      <div className="pnl-h">
        <h3>Audit terakhir di area ini</h3>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Auditor</th>
              <th>Skor</th>
              <th className="n">DM</th>
            </tr>
          </thead>
          <tbody>
            {l.map((a) => (
              <tr key={a.id}>
                <td>{dateLabel(a.date)}</td>
                <td>{a.auditor}</td>
                <td>
                  <span className={`pill ${cls(a.c.total)} mono`}>{fmt(a.c.total)}</span>
                </td>
                <td className="n mono">{a.c.dm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DeptDashboard({
  daudits,
  filters,
}: {
  audits: Audit[];
  daudits: DeptAudit[];
  filters: Filters;
  reload: () => void;
}) {
  const { catalog, session } = useApp();
  const role = session?.role;
  const scoped = role === 'prod';
  const VU: Unit[] = scoped ? catalog.units.filter((u) => u.id === session?.area) : catalog.units;
  const VD = scoped ? daudits.filter((a) => a.unit === session?.area) : daudits;
  const list = filterByRange(VD, filters.from, filters.to);
  const gran = filters.gran;
  const title = scoped ? 'Tren Audit · ' + (unitById(session?.area || '')?.name || '') : 'Dashboard Semua Departemen';

  const head = (
    <div className="bar-top">
      <div>
        <h2>{title}</h2>
        <div className="muted">
          Rentang: {rangeLabel(filters.from, filters.to)}. Skor memakai audit terbaru tiap unit pada periode. Standar {STD}.
        </div>
      </div>
      <RangeControls
        filters={filters}
        extra={
          <>
            <label className="f">
              Kolom heatmap
              <select value={gran} onChange={(e) => filters.set({ gran: e.target.value as 'week' | 'month' })}>
                <option value="week">Mingguan</option>
                <option value="month">Bulanan</option>
              </select>
            </label>
            {!scoped && (
              <button className="btn ghost" type="button" onClick={() => download('skor-audit-departemen.csv', csvDept(daudits, (id) => unitById(id)?.name || id))}>
                Unduh CSV skor
              </button>
            )}
          </>
        }
      />
    </div>
  );

  const lat: Record<string, DeptAudit> = {};
  list.forEach((a) => {
    const c = lat[a.unit];
    if (!c || cmp(c, a) < 0) lat[a.unit] = a;
  });
  const rows = VU.map((u) => ({ u, au: lat[u.id] ? withCalc(lat[u.id]) : null }));
  const done = rows.filter((r) => r.au && r.au.c.total != null) as { u: Unit; au: DeptAudit & { c: Calc } }[];
  const avg = done.length ? done.reduce((s, r) => s + (r.au.c.total as number), 0) / done.length : null;
  const below = done.filter((r) => (r.au.c.total as number) < STD).length;
  const fl = VD.flatMap((a) => Object.values(a.finds || {})).filter((f) => (f.status || 'Open') !== 'Closed');
  const overdue = fl.filter((f) => f.due && f.due < today()).length;

  const keys = [...new Set(list.map((a) => pKey(a.date, gran)))].sort().slice(-12);
  const cell: Record<string, Record<string, DeptAudit>> = {};
  list.forEach((a) => {
    const k = pKey(a.date, gran);
    if (!keys.includes(k)) return;
    const m = (cell[a.unit] = cell[a.unit] || {});
    const c = m[k];
    if (!c || cmp(c, a) < 0) m[k] = a;
  });
  const hv = rows.map((r) => {
    const vs = keys.map((k) => (cell[r.u.id] && cell[r.u.id][k] ? (calcOf(cell[r.u.id][k]).total as number) : null));
    const f = vs.filter((x) => x != null) as number[];
    return { u: r.u, vs, avg: f.length ? f.reduce((a, b) => a + b, 0) / f.length : null };
  });

  const sel = scoped ? session?.area : filters.dunit;
  let tl = list;
  if (sel !== 'all') tl = tl.filter((a) => a.unit === sel);
  const tmap: Record<string, Record<string, DeptAudit>> = {};
  tl.forEach((a) => {
    const k = pKey(a.date, gran);
    const r = (tmap[k] = tmap[k] || {});
    const c = r[a.unit];
    if (!c || cmp(c, a) < 0) r[a.unit] = a;
  });
  const pts = Object.keys(tmap)
    .sort()
    .slice(-24)
    .map((k) => {
      const l = Object.values(tmap[k]).map((a) => calcOf(a).total as number);
      const v = l.reduce((a, b) => a + b, 0) / l.length;
      return { lab: pLab(k, gran), v, tip: `${pLab(k, gran)}: ${v.toFixed(1)} (${l.length} unit)` };
    });

  const cnt: Record<string, { c: number; u: Unit; n: number }> = {};
  list.forEach((a) => {
    Object.keys(a.ans || {})
      .filter((n) => a.ans[n] === 'DM')
      .forEach((n) => {
        const k = a.unit + ':' + n;
        (cnt[k] = cnt[k] || { c: 0, u: unitById(a.unit) as Unit, n: +n }).c++;
      });
  });
  const top = Object.values(cnt).sort((a, b) => b.c - a.c).slice(0, 8);
  const mx = top.length ? top[0].c : 1;

  return (
    <>
      {head}
      <div className="kpis">
        <div className="card kpi">
          <span className="lab">Rata-rata skor</span>
          <span className="val mono" style={{ color: `var(--${cls(avg)})` }}>{fmt(avg)}</span>
          <span className="sub">dari {done.length} unit teraudit</span>
        </div>
        <div className="card kpi">
          <span className="lab">Unit teraudit</span>
          <span className="val">
            {done.length}
            <span className="muted" style={{ fontSize: 22 }}> / {VU.length}</span>
          </span>
          <span className="sub">{VU.length - done.length} unit belum diaudit</span>
        </div>
        <div className="card kpi">
          <span className="lab">Di bawah standar</span>
          <span className="val" style={{ color: `var(--${below ? 'bad' : 'good'})` }}>{below}</span>
          <span className="sub">unit dengan skor &lt; {STD}</span>
        </div>
        <div className="card kpi">
          <span className="lab">Temuan belum closed</span>
          <span className="val" style={{ color: `var(--${fl.length ? 'bad' : 'good'})` }}>{fl.length}</span>
          <span className="sub">{overdue} lewat due date</span>
        </div>
      </div>

      <section className="card pnl">
        <div className="pnl-h">
          <h3>Heatmap skor per unit</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {keys.length
              ? (gran === 'month' ? 'per bulan' : 'per minggu, label = tanggal akhir minggu (Sabtu)') + ', maks. 12 periode terakhir'
              : ''}
            . Hijau ≥ {STD}, kuning ≥ {WARN}, merah di bawahnya.
          </span>
        </div>
        {!keys.length ? (
          <div className="empty">Tidak ada audit pada rentang tanggal ini.</div>
        ) : (
          <div className="scroll">
            <table className="hm">
              <thead>
                <tr>
                  <th className="stick">Unit</th>
                  {keys.map((k) => (
                    <th className="n" key={k}>
                      {pLab(k, gran)}
                    </th>
                  ))}
                  <th className="n">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {hv.map((r) => (
                  <tr key={r.u.id}>
                    <td className="stick">
                      <b>{r.u.short}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{r.u.dept}</div>
                    </td>
                    {r.vs.map((v, i) => (
                      <td className={`c ${cls(v)}`} key={keys[i]} title={v == null ? undefined : `${r.u.name} · ${pLab(keys[i], gran)}: ${v.toFixed(2)}`}>
                        {v == null ? '–' : v.toFixed(1)}
                      </td>
                    ))}
                    <td className={`c ${cls(r.avg)}`}>
                      <b>{r.avg == null ? '–' : r.avg.toFixed(1)}</b>
                    </td>
                  </tr>
                ))}
                {hv.length > 1 &&
                  (() => {
                    const cav = keys.map((k, i) => {
                      const f = hv.map((r) => r.vs[i]).filter((x) => x != null) as number[];
                      return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
                    });
                    const all = cav.filter((x) => x != null) as number[];
                    const ov = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
                    return (
                      <tr>
                        <td className="stick">
                          <b>Rata-rata semua unit</b>
                        </td>
                        {cav.map((v, i) => (
                          <td className={`c ${cls(v)}`} key={keys[i]}>
                            <b>{v == null ? '–' : v.toFixed(1)}</b>
                          </td>
                        ))}
                        <td className={`c ${cls(ov)}`}>
                          <b>{ov == null ? '–' : ov.toFixed(1)}</b>
                        </td>
                      </tr>
                    );
                  })()}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card pnl">
        <div className="pnl-h">
          <h3>Capaian kategori, audit terbaru</h3>
          <span className="muted" style={{ fontSize: 12 }}>% = M ÷ (M + DM) pada kategori itu</span>
        </div>
        <div className="scroll">
          <table className="t-wide">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Skor</th>
                <th>Rincian kategori</th>
                <th className="n">DM</th>
                <th>Tgl audit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                if (!r.au)
                  return (
                    <tr key={r.u.id}>
                      <td>
                        <b>{r.u.short}</b>
                        <div className="muted" style={{ fontSize: 12 }}>{r.u.dept}</div>
                      </td>
                      <td colSpan={4}>
                        <span className="pill na">Belum diaudit</span>
                      </td>
                    </tr>
                  );
                const c = r.au.c;
                return (
                  <tr key={r.u.id}>
                    <td>
                      <b>{r.u.short}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{r.u.dept}</div>
                    </td>
                    <td>
                      <span className={`pill ${cls(c.total)} mono`}>{fmt(c.total)}</span>
                    </td>
                    <td>
                      <div className="catpills">
                        {c.secs.map((s) => {
                          const p = s.pct == null ? null : s.pct * 100;
                          return (
                            <span className={`pill ${cls(p)}`} key={s.k} title={`${s.m} M, ${s.d} DM${s.na ? ', ' + s.na + ' N/A' : ''} · bobot ${+s.w.toFixed(1)}`}>
                              {s.name} {p == null ? '–' : p.toFixed(0) + '%'}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="n mono">{c.dm}</td>
                    <td className="muted">{dateLabel(r.au.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={scoped ? '' : 'grid2'}>
        <section className="card pnl">
          <div className="pnl-h">
            <h3>Skor per {gran === 'month' ? 'bulan' : 'minggu'}</h3>
            {!scoped && (
              <label className="f" style={{ minWidth: 200 }}>
                <select value={filters.dunit} onChange={(e) => filters.set({ dunit: e.target.value })}>
                  <option value="all">Rata-rata semua unit</option>
                  {catalog.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <StdBarLegend />
          <div className="scroll">
            <BarSeries pts={pts} aria="Skor audit departemen per periode" />
          </div>
        </section>
        {!scoped && (
          <section className="card pnl">
            <div className="pnl-h">
              <h3>Skor terbaru per unit</h3>
              <span className="muted" style={{ fontSize: 12 }}>sumbu mulai dari 60</span>
            </div>
            <StdBarLegend />
            <Hbars
              rows={done.map((r) => ({ name: r.u.short, v: r.au.c.total as number, tip: `${r.u.name} · ${dateLabel(r.au.date)}: ${(r.au.c.total as number).toFixed(1)}` }))}
              aria="Skor audit terbaru per unit"
            />
          </section>
        )}
      </div>

      <section className="card pnl">
        <div className="pnl-h">
          <h3>Poin yang paling sering temuan</h3>
          <span className="muted" style={{ fontSize: 12 }}>{rangeLabel(filters.from, filters.to)}</span>
        </div>
        {top.length ? (
          <div className="rows">
            {top.map((o, idx) => {
              const it = o.u.items.find((i) => i.n === o.n);
              return (
                <div key={idx}>
                  <div className="rrow">
                    <div className="nm">
                      <b>{o.u.short}</b> <span className="mono muted">#{nl(o.n)}</span> {it ? it.t : ''}
                    </div>
                    <span className="pill bad">{o.c}×</span>
                  </div>
                  <div className="rrow">
                    <div className="track">
                      <i style={{ width: `${(o.c / mx) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">Tidak ada temuan DM pada rentang ini.</div>
        )}
      </section>
    </>
  );
}
