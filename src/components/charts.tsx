'use client';

import { STD, WARN } from '@/lib/constants';
import { byWeek } from '@/lib/derive';
import { cls, wrapName, wlab } from '@/lib/format';
import { calcOf } from '@/lib/scoring';
import type { Audit, Section } from '@/lib/types';

export function SectionLegend({ sections }: { sections: Section[] }) {
  return (
    <div className="legend2">
      {sections.map((s, i) => (
        <span key={s.k}>
          <i style={{ background: `var(--c${i + 1})` }} />
          {s.name} ({s.w})
        </span>
      ))}
      <span>
        <i
          style={{ background: 'none', borderTop: '2px dashed var(--warn)', height: 0, width: 16, verticalAlign: '3px' }}
        />
        Standar {STD}
      </span>
    </div>
  );
}

export const StdBarLegend = () => (
  <div className="legend2">
    <span>
      <i style={{ background: 'var(--good-fill)' }} />
      Memenuhi standar
    </span>
    <span>
      <i style={{ background: 'var(--bad-fill)' }} />
      Di bawah standar
    </span>
    <span>
      <i
        style={{ background: 'none', borderTop: '2px dashed var(--warn)', height: 0, width: 16, verticalAlign: '3px' }}
      />
      Standar {STD}
    </span>
  </div>
);

export function BarSeries({ pts: ptsIn, aria }: { pts: { lab: string; v: number; tip: string }[]; aria: string }) {
  const pts = ptsIn.filter((p) => Number.isFinite(p.v));
  if (!pts.length) return <div className="empty">Belum ada data pada rentang tanggal ini.</div>;
  const lo = Math.min(60, Math.floor(Math.min(...pts.map((p) => p.v)) / 10) * 10);
  const hi = 100;
  const BW = 22;
  const G = 7;
  const L = 34;
  const T = 22;
  const PB = 190;
  const Bm = 52;
  const H = T + PB + Bm;
  const W = L + pts.length * (BW + G) + 10;
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * PB;
  const grid: number[] = [];
  for (let v = lo; v <= hi; v += 10) grid.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={Math.max(W, 300)} height={H} role="img" aria-label={aria}>
      {grid.map((v) => (
        <g key={`g${v}`}>
          <line className="grid" x1={L} x2={W - 6} y1={y(v)} y2={y(v)} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {pts.map((p, i) => {
        const x = L + 6 + i * (BW + G);
        const k = cls(p.v) === 'good' ? 'good' : 'bad';
        return (
          <g key={i}>
            <rect x={x} y={y(p.v)} width={BW} height={T + PB - y(p.v)} fill={`var(--${k}-fill)`} rx={2}>
              <title>{p.tip}</title>
            </rect>
            <text x={x + BW / 2} y={y(p.v) - 4} textAnchor="middle" style={{ fontSize: '9.5px', fill: 'var(--ink)' }}>
              {p.v.toFixed(1)}
            </text>
            <text
              x={x + BW / 2 + 4}
              y={T + PB + 14}
              textAnchor="end"
              transform={`rotate(-45 ${x + BW / 2 + 4} ${T + PB + 14})`}
              style={{ fontSize: '10px' }}
            >
              {p.lab}
            </text>
          </g>
        );
      })}
      <line className="std" x1={L} x2={W - 6} y1={y(STD)} y2={y(STD)} />
    </svg>
  );
}

export function Hbars({ rows: rowsIn, aria }: { rows: { name: string; v: number; tip: string }[]; aria: string }) {
  const rows = rowsIn.filter((r) => Number.isFinite(r.v));
  if (!rows.length) return <div className="empty">Belum ada data pada rentang tanggal ini.</div>;
  const lo = Math.min(60, Math.floor(Math.min(...rows.map((r) => r.v)) / 10) * 10);
  const RH = 24;
  const L = 150;
  const R = 46;
  const W = 520;
  const T = 8;
  const B = 24;
  const H = T + rows.length * RH + B;
  const x = (v: number) => L + ((Math.max(lo, v) - lo) / (100 - lo)) * (W - L - R);
  const grid: number[] = [];
  for (let v = lo; v <= 100; v += 10) grid.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={aria}>
      {grid.map((v) => (
        <g key={`g${v}`}>
          <line className="grid" x1={x(v)} x2={x(v)} y1={T} y2={H - B} />
          <text x={x(v)} y={H - 8} textAnchor="middle">
            {v}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const yy = T + i * RH + 4;
        const k = r.v >= STD ? 'good' : 'bad';
        return (
          <g key={i}>
            <text x={L - 8} y={yy + 11} textAnchor="end" style={{ fill: 'var(--ink)' }}>
              {r.name}
            </text>
            <rect x={L} y={yy} width={Math.max(1, x(r.v) - L)} height={15} rx={2} fill={`var(--${k}-fill)`}>
              <title>{r.tip}</title>
            </rect>
            <text x={x(r.v) + 5} y={yy + 11.5} style={{ fill: 'var(--ink)', fontSize: '10.5px' }}>
              {r.v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <line className="std" x1={x(STD)} x2={x(STD)} y1={T} y2={H - B} />
    </svg>
  );
}

export function ChartA({
  list,
  areas,
  sections,
  weeks,
  wide,
}: {
  list: Audit[];
  areas: { id: string; name: string }[];
  sections: Section[];
  weeks: number;
  wide: boolean;
}) {
  const bw = byWeek(list);
  const wk = bw.weeks.slice(-weeks);
  if (!wk.length) return <div className="empty">Belum ada audit pada rentang tanggal ini.</div>;
  const cap = (
    <div className="muted" style={{ fontSize: '12px' }}>
      {wk.length > 1
        ? (wide ? 'Urutan batang per area, kiri ke kanan: ' : 'Urutan batang per area, atas ke bawah: ') +
          wk.map((w) => 'WE ' + wlab(w)).join(' → ') +
          ' (paling kanan/bawah = terbaru).'
        : 'WE ' + wlab(wk[0])}
    </div>
  );
  return (
    <>
      {cap}
      {wide ? (
        <ChartAv bw={bw} weeks={wk} areas={areas} sections={sections} />
      ) : (
        <ChartAh bw={bw} weeks={wk} areas={areas} sections={sections} />
      )}
    </>
  );
}

function ChartAv({
  bw,
  weeks,
  areas,
  sections,
}: {
  bw: ReturnType<typeof byWeek>;
  weeks: string[];
  areas: { id: string; name: string }[];
  sections: Section[];
}) {
  const n = weeks.length;
  const G = 2;
  const PAD = 8;
  const L = 30;
  const TW = 1100;
  const T = 34;
  const PB = 250;
  const gwT = (TW - L - 8) / areas.length;
  let BW = (gwT - PAD - (n - 1) * G) / n;
  let fit = true;
  if (BW < 12) {
    BW = 12;
    fit = false;
  }
  const gw = n * BW + (n - 1) * G + PAD;
  const W = fit ? TW : Math.ceil(L + areas.length * gw + 8);
  const rotTot = BW < 24;
  const rotWk = BW + G < 34;
  const Bm = rotWk ? 108 : 76;
  const H = T + PB + Bm;
  const y = (v: number) => T + ((100 - v) / 100) * PB;
  const grid: number[] = [];
  for (let v = 0; v <= 100; v += 20) grid.push(v);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      {...(fit ? { style: { width: '100%', height: 'auto', display: 'block' } } : { width: W, height: H })}
      role="img"
      aria-label="Skor audit per area dan komponen"
    >
      {grid.map((v) => (
        <g key={`g${v}`}>
          <line className="grid" x1={L} x2={W - 8} y1={y(v)} y2={y(v)} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {areas.map((a, ai) => {
        const last = [...weeks].reverse().map((w) => bw.map[w]?.[a.id]).find(Boolean);
        if (last && calcOf(last).total! < WARN)
          return (
            <rect
              key={`bg${ai}`}
              x={L + ai * gw + 1}
              y={T - (rotTot ? 28 : 16)}
              width={gw - 2}
              height={PB + Bm + (rotTot ? 22 : 10)}
              fill="var(--bad-bg)"
              opacity={0.7}
              rx={4}
            />
          );
        return null;
      })}
      {areas.map((a, ai) => {
        const gx = L + ai * gw;
        return (
          <g key={a.id}>
            {weeks.map((w, wi) => {
              const x = gx + PAD / 2 + wi * (BW + G);
              const cx = x + BW / 2;
              const au = bw.map[w]?.[a.id];
              const c = au ? calcOf(au) : null;
              let cum = 0;
              return (
                <g key={w}>
                  {rotWk ? (
                    <text
                      x={cx + 3}
                      y={T + PB + 8}
                      textAnchor="end"
                      transform={`rotate(-90 ${cx + 3} ${T + PB + 8})`}
                      style={{ fontSize: '9.5px' }}
                    >
                      {wlab(w)}
                    </text>
                  ) : (
                    <text x={cx} y={T + PB + 14} textAnchor="middle" style={{ fontSize: '10px' }}>
                      {wlab(w)}
                    </text>
                  )}
                  {c &&
                    sections.map((sc, i) => {
                      const p = c.secs[i]?.pts || 0;
                      if (p <= 0) return null;
                      const y1 = y(cum + p);
                      const h = (p / 100) * PB;
                      cum += p;
                      return (
                        <g key={i}>
                          <rect x={x} y={y1} width={BW} height={h} fill={`var(--c${i + 1})`}>
                            <title>{`${a.name} · WE ${wlab(w)} · ${sc.name}: ${p.toFixed(1)} dari ${sc.w}`}</title>
                          </rect>
                          {h >= 13 && BW >= 16 && (
                            <text className="sl" x={cx} y={y1 + h / 2 + 4} textAnchor="middle">
                              {p.toFixed(0)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  {c &&
                    (() => {
                      const tl = c.total! >= 99.95 ? '100' : c.total!.toFixed(1);
                      const ty = y(Math.min(100, cum)) - 5;
                      return rotTot ? (
                        <text
                          className="tl"
                          x={cx + 4}
                          y={ty}
                          transform={`rotate(-90 ${cx + 4} ${ty})`}
                          style={{ fill: `var(--${cls(c.total)}-ink)` }}
                        >
                          {tl}
                        </text>
                      ) : (
                        <text className="tl" x={cx} y={ty} textAnchor="middle" style={{ fill: `var(--${cls(c.total)}-ink)` }}>
                          {tl}
                        </text>
                      );
                    })()}
                </g>
              );
            })}
            {wrapName(a.name, Math.max(8, Math.floor(gw / 6.2))).map((ln, li) => (
              <text className="an" key={li} x={gx + gw / 2} y={T + PB + (rotWk ? 56 : 34) + li * 12} textAnchor="middle">
                {ln}
              </text>
            ))}
          </g>
        );
      })}
      <line className="std" x1={L} x2={W - 8} y1={y(STD)} y2={y(STD)} />
    </svg>
  );
}

function ChartAh({
  bw,
  weeks,
  areas,
  sections,
}: {
  bw: ReturnType<typeof byWeek>;
  weeks: string[];
  areas: { id: string; name: string }[];
  sections: Section[];
}) {
  const n = weeks.length;
  const W = 380;
  const L = 104;
  const R = 44;
  const T = 6;
  const B = 22;
  const BH = Math.max(7, Math.min(14, Math.floor(34 / n)));
  const rowH = n * (BH + 2) + 12;
  const H = T + areas.length * rowH + B;
  const x = (v: number) => L + (v / 100) * (W - L - R);
  const grid: number[] = [];
  for (let v = 0; v <= 100; v += 20) grid.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Skor audit per area dan komponen">
      {grid.map((v) => (
        <g key={`g${v}`}>
          <line className="grid" x1={x(v)} x2={x(v)} y1={T} y2={H - B} />
          <text x={x(v)} y={H - 8} textAnchor="middle">
            {v}
          </text>
        </g>
      ))}
      {areas.map((a, ai) => {
        const y0 = T + ai * rowH;
        const last = [...weeks].reverse().map((w) => bw.map[w]?.[a.id]).find(Boolean);
        const nm = wrapName(a.name, 17);
        const ty = y0 + rowH / 2 - (nm.length - 1) * 6 + 3;
        return (
          <g key={a.id}>
            {last && calcOf(last).total! < WARN && (
              <rect x={2} y={y0 + 1} width={W - 4} height={rowH - 2} fill="var(--bad-bg)" opacity={0.7} rx={4} />
            )}
            {nm.map((ln, li) => (
              <text className="an" key={li} x={L - 8} y={ty + li * 12} textAnchor="end">
                {ln}
              </text>
            ))}
            {weeks.map((w, wi) => {
              const au = bw.map[w]?.[a.id];
              if (!au) return null;
              const by = y0 + 6 + wi * (BH + 2);
              const c = calcOf(au);
              let cum = 0;
              return (
                <g key={w}>
                  {sections.map((sc, i) => {
                    const p = c.secs[i]?.pts || 0;
                    if (p <= 0) return null;
                    const w2 = (p / 100) * (W - L - R);
                    const left = x(cum);
                    cum += p;
                    return (
                      <g key={i}>
                        <rect x={left} y={by} width={w2} height={BH} fill={`var(--c${i + 1})`}>
                          <title>{`${a.name} · WE ${wlab(w)} · ${sc.name}: ${p.toFixed(1)} dari ${sc.w}`}</title>
                        </rect>
                        {w2 >= 16 && BH >= 11 && (
                          <text className="sl" x={left + w2 / 2} y={by + BH / 2 + 4} textAnchor="middle" style={{ fontSize: '10px' }}>
                            {p.toFixed(0)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text
                    className="tl"
                    x={x(Math.min(100, cum)) + 4}
                    y={by + BH / 2 + 4}
                    style={{ fill: `var(--${cls(c.total)}-ink)` }}
                  >
                    {c.total! >= 99.95 ? '100' : c.total!.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <line className="std" x1={x(STD)} x2={x(STD)} y1={T} y2={H - B} />
    </svg>
  );
}
