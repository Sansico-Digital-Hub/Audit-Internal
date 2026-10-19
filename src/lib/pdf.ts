import { STD, WARN } from './constants';

export interface PdfPart {
  name: string;
  pts: number;
  w: number;
}

export interface PdfBar {
  key: string;
  total: number;
  parts: PdfPart[];
}

export interface PdfGroup {
  name: string;
  bars: PdfBar[];
  latest: number | null;
}

export interface PdfWeekLabel {
  key: string;
  label: string;
}

export interface PdfReport {
  title: string;
  scope: string;
  period: string;
  weekLabels: PdfWeekLabel[];
  groups: PdfGroup[];
  weeks: { lab: string; v: number }[];
  latest: { name: string; v: number; date: string }[];
  legend: string[];
  weeklyTitle?: string;
  latestTitle?: string;
}

const PALETTE = ['#2b5f9e', '#b45f06', '#6b4c98', '#1f7a6e', '#0f766e', '#be123c', '#7c3aed', '#0891b2', '#4d7c0f', '#a16207', '#4338ca', '#9d174d'];

// A4 landscape, satu halaman.
const A4 = { w: 841.89, h: 595.28 };
const M = 18;
const RIGHT = A4.w - M;

const clean = (s: string) => s.replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

function hexColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export async function buildPdf(report: PdfReport) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.w, A4.h]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.09, 0.08);
  const muted = rgb(0.39, 0.45, 0.54);
  const grid = rgb(0.86, 0.89, 0.93);
  const blue = rgb(0.118, 0.373, 0.62);
  const good = rgb(0.086, 0.639, 0.29);
  const bad = rgb(0.937, 0.267, 0.267);
  const warn = rgb(0.918, 0.702, 0.031);
  const pink = rgb(1, 0.91, 0.93);
  const color = (hex: string) => {
    const c = hexColor(hex);
    return rgb(c.r, c.g, c.b);
  };

  const text = (s: string, x: number, y: number, size: number, f = font, c = ink, rotate?: number) =>
    page.drawText(clean(s), { x, y, size, font: f, color: c, ...(rotate ? { rotate: degrees(rotate) } : {}) });

  const clip = (s: string, maxW: number, size: number, f = font) => {
    const raw = clean(s);
    if (f.widthOfTextAtSize(raw, size) <= maxW) return raw;
    let cut = raw;
    while (cut.length > 1 && f.widthOfTextAtSize(cut + '...', size) > maxW) cut = cut.slice(0, -1);
    return cut + '...';
  };

  const rect = (x: number, y: number, w: number, h: number, c: ReturnType<typeof rgb>) =>
    page.drawRectangle({ x, y, width: Math.max(0, w), height: Math.max(0, h), color: c });

  // Banner judul
  page.drawRectangle({ x: M, y: 559, width: RIGHT - M, height: 22, color: blue });
  const titleSize = (() => {
    let s = 13;
    while (s > 9 && bold.widthOfTextAtSize(clean(report.title), s) > RIGHT - M - 24) s -= 0.5;
    return s;
  })();
  const tw = bold.widthOfTextAtSize(clean(report.title), titleSize);
  text(report.title, (A4.w - tw) / 2, 566, titleSize, bold, rgb(1, 1, 1));

  // Legend komponen + standar
  let lx = M;
  let ly = 549;
  report.legend.slice(0, 6).forEach((name, i) => {
    const w = 9 + font.widthOfTextAtSize(clean(name), 7) + 12;
    if (lx + w > RIGHT - 250) {
      lx = M;
      ly -= 9;
    }
    rect(lx, ly - 1.5, 6, 6, color(PALETTE[i % PALETTE.length]));
    text(name, lx + 9, ly, 7, font, muted);
    lx += w;
  });
  if (report.legend.length > 6) {
    text(`+${report.legend.length - 6}`, lx + 2, ly, 6.5, font, muted);
    lx += 16;
  }
  page.drawLine({
    start: { x: lx + 4, y: ly + 2 },
    end: { x: lx + 22, y: ly + 2 },
    thickness: 1.2,
    color: warn,
    dashArray: [3, 2],
  });
  text('STANDARD ' + STD, lx + 27, ly, 7, font, muted);
  const rightInfo = report.scope + (report.period ? ' · ' + report.period : '');
  text(clip(rightInfo, 250, 7), RIGHT - font.widthOfTextAtSize(clip(rightInfo, 250, 7), 7), ly, 7, font, muted);

  // Chart utama: stacked bar per area/unit, per periode
  const plotTop = ly - 14;
  const plotBottom = 342;
  const plotLeft = 48;
  const plotRight = RIGHT - 8;
  const plotH = plotTop - plotBottom;
  const groups = report.groups;
  const barsPerGroup = Math.max(1, report.weekLabels.length);
  const groupW = groups.length ? (plotRight - plotLeft) / groups.length : plotRight - plotLeft;
  const inner = Math.max(8, groupW - 8);
  const barW = Math.max(3, Math.min(18, (inner - (barsPerGroup - 1) * 2) / barsPerGroup));
  const barGap = 2;

  for (let v = 0; v <= 100; v += 20) {
    const y = plotBottom + (v / 100) * plotH;
    page.drawLine({ start: { x: plotLeft, y }, end: { x: plotRight, y }, thickness: 0.4, color: grid });
    text(String(v), plotLeft - 5 - font.widthOfTextAtSize(String(v), 5.5), y - 2, 5.5, font, muted);
  }
  const y = (v: number) => plotBottom + (Math.max(0, Math.min(100, v)) / 100) * plotH;

  if (!groups.length) {
    text('Belum ada audit pada rentang tanggal ini.', plotLeft, plotBottom + plotH / 2, 8, font, muted);
  }
  groups.forEach((g, gi) => {
    const gx = plotLeft + gi * groupW;
    if (g.latest != null && g.latest < WARN) {
      rect(gx + 1, plotBottom, groupW - 2, plotH, pink);
    }
    const totalW = barsPerGroup * barW + (barsPerGroup - 1) * barGap;
    const startX = gx + (groupW - totalW) / 2;
    const byKey = new Map(g.bars.map((b) => [b.key, b]));
    report.weekLabels.forEach((w, wi) => {
      const bar = byKey.get(w.key);
      const bx = startX + wi * (barW + barGap);
      const cx = bx + barW / 2;
      text(w.label, cx - 2, plotBottom - 4, 5.2, font, muted, -90);
      if (bar) {
        let cy = plotBottom;
        bar.parts.forEach((p, pi) => {
          const h = (Math.max(0, Math.min(100, p.pts)) / 100) * plotH;
          if (h <= 0) return;
          rect(bx, cy, barW, h, color(PALETTE[pi % PALETTE.length]));
          // Skor komponen di dalam batang, mengikuti dashboard.
          if (barW >= 8 && h >= 8) {
            const label = p.pts.toFixed(0);
            text(label, cx - bold.widthOfTextAtSize(label, 4.6) / 2, cy + h / 2 - 2, 4.6, bold, rgb(1, 1, 1));
          }
          cy += h;
        });
        if (barW >= 8) {
          const totalLabel = bar.total.toFixed(1);
          text(totalLabel, cx - bold.widthOfTextAtSize(totalLabel, 5.2) / 2, y(bar.total) + 2, 5.2, bold, ink);
        } else {
          // 5-8 minggu: label semua batang dengan angka bulat kecil agar tetap muat.
          const totalLabel = String(Math.round(bar.total));
          const size = Math.max(2.6, Math.min(3.4, (barW + barGap) * 0.55));
          text(totalLabel, cx - bold.widthOfTextAtSize(totalLabel, size) / 2, y(bar.total) + 1, size, bold, ink);
        }
      }
    });
    const nm = clip(g.name, 58, 5.4, bold);
    text(nm, gx + groupW / 2 - 2, plotBottom - 28, 5.4, bold, ink, -45);
  });
  // garis standar pada chart utama
  page.drawLine({
    start: { x: plotLeft, y: y(STD) },
    end: { x: plotRight, y: y(STD) },
    thickness: 1,
    color: warn,
    dashArray: [3, 3],
  });

  // Panel bawah
  const panelY = 26;
  const panelH = 234;
  const gap = 12;
  const panelW = (RIGHT - M - gap) / 2;
  const panelTop = panelY + panelH;
  const drawPanel = (x: number, title: string) => {
    page.drawRectangle({ x, y: panelY, width: panelW, height: panelH, borderColor: grid, borderWidth: 0.8, color: rgb(1, 1, 1) });
    text(title, x + 10, panelTop - 13, 8, bold, ink);
  };
  const chartBottom = 80;
  const chartTop = panelTop - 24;

  // Kiri: overall score per minggu
  const leftX = M;
  drawPanel(leftX, report.weeklyTitle || 'OVERALL SCORE');
  const lPlotLeft = leftX + 30;
  const lPlotRight = leftX + panelW - 12;
  const lWeeks = report.weeks;
  const lSlot = lWeeks.length ? (lPlotRight - lPlotLeft) / lWeeks.length : lPlotRight - lPlotLeft;
  const lBarW = Math.max(2, Math.min(13, lSlot * 0.68));
  for (let v = 0; v <= 100; v += 20) {
    const yy = chartBottom + (v / 100) * (chartTop - chartBottom);
    page.drawLine({ start: { x: lPlotLeft, y: yy }, end: { x: lPlotRight, y: yy }, thickness: 0.4, color: grid });
    text(String(v), lPlotLeft - 5 - font.widthOfTextAtSize(String(v), 5.5), yy - 2, 5.5, font, muted);
  }
  const lY = (v: number) => chartBottom + (Math.max(0, Math.min(100, v)) / 100) * (chartTop - chartBottom);
  if (!lWeeks.length) {
    text('Belum ada data.', lPlotLeft + 6, chartBottom + 40, 7, font, muted);
  }
  lWeeks.forEach((w, i) => {
    const cx = lPlotLeft + i * lSlot + lSlot / 2;
    const top = lY(w.v);
    rect(cx - lBarW / 2, chartBottom, lBarW, top - chartBottom, w.v >= STD ? good : bad);
    const label = w.lab;
    text(label, cx + 2, chartBottom - 3, 5, font, muted, -90);
    const value = w.v.toFixed(0);
    if (lSlot >= 8) {
      text(value, cx - bold.widthOfTextAtSize(value, 4.6) / 2, top + 2, 4.6, bold, ink);
    } else {
      text(value, cx - 1, top + 3, 4.2, bold, ink, 90);
    }
  });
  page.drawLine({
    start: { x: lPlotLeft, y: lY(STD) },
    end: { x: lPlotRight, y: lY(STD) },
    thickness: 0.9,
    color: warn,
    dashArray: [3, 3],
  });
  rect(leftX + 10, 33, 7, 7, good);
  text('Overall Score', leftX + 20, 34, 6.5, font, muted);
  page.drawLine({ start: { x: leftX + 92, y: 36 }, end: { x: leftX + 110, y: 36 }, thickness: 1, color: warn, dashArray: [3, 2] });
  text('Standard ' + STD, leftX + 114, 34, 6.5, font, muted);

  // Kanan: skor terbaru per area/unit
  const rightX = M + panelW + gap;
  drawPanel(rightX, report.latestTitle || 'SKOR TERBARU PER AREA');
  const rPlotLeft = rightX + 30;
  const rPlotRight = rightX + panelW - 12;
  const latest = report.latest.slice(0, 24);
  const rSlot = latest.length ? (rPlotRight - rPlotLeft) / latest.length : rPlotRight - rPlotLeft;
  const rBarW = Math.max(3, Math.min(18, rSlot * 0.66));
  for (let v = 0; v <= 100; v += 20) {
    const yy = chartBottom + (v / 100) * (chartTop - chartBottom);
    page.drawLine({ start: { x: rPlotLeft, y: yy }, end: { x: rPlotRight, y: yy }, thickness: 0.4, color: grid });
    text(String(v), rPlotLeft - 5 - font.widthOfTextAtSize(String(v), 5.5), yy - 2, 5.5, font, muted);
  }
  const rY = (v: number) => chartBottom + (Math.max(0, Math.min(100, v)) / 100) * (chartTop - chartBottom);
  if (!latest.length) {
    text('Belum ada data.', rPlotLeft + 6, chartBottom + 40, 7, font, muted);
  }
  latest.forEach((r, i) => {
    const cx = rPlotLeft + i * rSlot + rSlot / 2;
    const top = rY(r.v);
    rect(cx - rBarW / 2, chartBottom, rBarW, top - chartBottom, r.v >= STD ? good : bad);
    text(clip(r.name, 62, 5, font), cx + 2, chartBottom - 3, 5, font, muted, -45);
    text(r.v.toFixed(0), cx - font.widthOfTextAtSize(r.v.toFixed(0), 5) / 2, top + 2, 5, bold, ink);
  });
  page.drawLine({
    start: { x: rPlotLeft, y: rY(STD) },
    end: { x: rPlotRight, y: rY(STD) },
    thickness: 0.9,
    color: warn,
    dashArray: [3, 3],
  });

  // Kontrak fitur: PDF harus tetap 1 halaman A4 landscape.
  const first = doc.getPage(0);
  if (doc.getPageCount() !== 1 || first.getWidth() !== A4.w || first.getHeight() !== A4.h) {
    throw new Error('PDF harus 1 halaman A4 landscape.');
  }

  return doc.save();
}

export async function downloadPdf(report: PdfReport, filename: string) {
  const bytes = await buildPdf(report);
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
