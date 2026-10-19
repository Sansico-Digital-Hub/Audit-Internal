import { STD } from './constants';
import { dateLabel } from './format';

export interface PdfPart {
  name: string;
  pts: number;
  w: number;
}

export interface PdfPerformance {
  name: string;
  total: number;
  date: string;
  parts: PdfPart[];
}

export interface PdfReport {
  title: string;
  scope: string;
  period: string;
  performance: PdfPerformance[];
  weeks: { lab: string; v: number }[];
  latest: { name: string; v: number; date: string }[];
  legend: string[];
  weeklyTitle?: string;
  latestTitle?: string;
}

const PALETTE = ['#2b5f9e', '#b45f06', '#6b4c98', '#1f7a6e', '#0f766e', '#be123c', '#7c3aed', '#0891b2', '#4d7c0f', '#a16207', '#4338ca', '#9d174d'];

const A4 = { w: 595.28, h: 841.89 };
const M = 34;
const RIGHT = A4.w - M;

const clean = (s: string) => s.replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

function hexColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export async function buildPdf(report: PdfReport) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.w, A4.h]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.09, 0.08);
  const muted = rgb(0.39, 0.45, 0.54);
  const line = rgb(0.9, 0.92, 0.95);
  const good = rgb(0.086, 0.639, 0.29);
  const bad = rgb(0.937, 0.267, 0.267);
  const warn = rgb(0.918, 0.702, 0.031);
  const color = (hex: string) => {
    const c = hexColor(hex);
    return rgb(c.r, c.g, c.b);
  };

  const text = (s: string, x: number, y: number, size: number, f = font, c = ink) =>
    page.drawText(clean(s), { x, y, size, font: f, color: c });

  const clip = (s: string, maxW: number, size: number, f = font) => {
    const raw = clean(s);
    if (f.widthOfTextAtSize(raw, size) <= maxW) return raw;
    let cut = raw;
    while (cut.length > 1 && f.widthOfTextAtSize(cut + '...', size) > maxW) cut = cut.slice(0, -1);
    return cut + '...';
  };

  const rect = (x: number, y: number, w: number, h: number, c: ReturnType<typeof rgb>) =>
    page.drawRectangle({ x, y, width: Math.max(0, w), height: Math.max(0, h), color: c });

  const hline = (y: number, c = line, thickness = 1) =>
    page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness, color: c });

  // Header
  text('AUDIT INTERNAL', M, 806, 7.5, bold, muted);
  text(report.title, M, 786, 18, bold, ink);
  text(report.scope, M, 769, 8.5, font, ink);
  text(report.period, M, 757, 7.5, font, muted);
  const stamp = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  text('Dibuat ' + stamp, RIGHT - font.widthOfTextAtSize(clean('Dibuat ' + stamp), 7.5), 806, 7.5, font, muted);
  hline(750);

  // Section 1: Performance Process Audit
  text('Performance Process Audit', M, 735, 10.5, bold, ink);
  text('Komponen dari audit terbaru tiap ' + (report.latestTitle?.toLowerCase().includes('unit') ? 'unit' : 'area'), RIGHT - 190, 735, 7.5, font, muted);
  let ly = 721;
  let lx = M;
  report.legend.forEach((name, i) => {
    const w = 9 + font.widthOfTextAtSize(clean(name), 7.5) + 12;
    if (lx + w > RIGHT) {
      lx = M;
      ly -= 10;
    }
    rect(lx, ly - 1.5, 6, 6, color(PALETTE[i % PALETTE.length]));
    text(name, lx + 9, ly, 7.5, font, muted);
    lx += w;
  });

  const perf = report.performance;
  const perfTop = ly - 12;
  const maxRows = perf.length ? Math.min(perf.length, 24) : 0;
  const rowH = maxRows ? Math.max(8, Math.min(14, (perfTop - 468) / maxRows)) : 12;
  const barX = 152;
  const barW = 318;
  if (!maxRows) {
    text('Belum ada audit pada rentang tanggal ini.', M, perfTop - 10, 8, font, muted);
  }
  perf.slice(0, maxRows).forEach((r, i) => {
    const y = perfTop - i * rowH;
    text(clip(r.name, 110, 8), M, y, 8, font, ink);
    rect(barX, y - 1, barW, Math.max(4, rowH - 5), rgb(0.94, 0.96, 0.98));
    let cx = barX;
    const total = Math.max(0, Math.min(100, r.total));
    r.parts.forEach((p, k) => {
      const w = (Math.max(0, Math.min(100, p.pts)) / 100) * barW;
      if (w <= 0) return;
      rect(cx, y - 1, w, Math.max(4, rowH - 5), color(PALETTE[k % PALETTE.length]));
      cx += w;
    });
    text(total.toFixed(1), barX + barW + 6, y, 8, bold, total >= STD ? good : bad);
    text(dateLabel(r.date), 522, y, 7, font, muted);
  });
  const perfBottom = maxRows ? perfTop - maxRows * rowH : perfTop - 20;
  if (perf.length > maxRows) text(`+${perf.length - maxRows} lainnya`, M, perfBottom + 2, 7, font, muted);

  // Section 2: Overall score per week
  const s2Head = Math.max(perfBottom - 20, 366);
  hline(s2Head + 14);
  text(report.weeklyTitle || 'Overall score per minggu', M, s2Head, 10.5, bold, ink);
  text('Standar ' + STD, RIGHT - font.widthOfTextAtSize('Standar ' + STD, 7.5), s2Head, 7.5, font, muted);
  const weeks = report.weeks.slice(-12);
  const chartTop = s2Head - 10;
  const chartBottom = chartTop - 92;
  if (!weeks.length) {
    text('Belum ada audit pada rentang tanggal ini.', M, chartTop - 16, 8, font, muted);
  } else {
    for (let v = 60; v <= 100; v += 10) {
      const y = chartBottom + ((v - 60) / 40) * 92;
      page.drawLine({ start: { x: 48, y }, end: { x: RIGHT, y }, thickness: 0.4, color: rgb(0.86, 0.89, 0.93) });
      text(String(v), 40 - font.widthOfTextAtSize(String(v), 6.5), y - 2, 6.5, font, muted);
    }
    const y = (v: number) => chartBottom + ((Math.max(60, Math.min(100, v)) - 60) / 40) * 92;
    const slot = (RIGHT - 54) / weeks.length;
    const bw = Math.max(6, Math.min(28, slot - 6));
    weeks.forEach((w, i) => {
      const cx = 54 + i * slot + slot / 2;
      const yy = y(w.v);
      rect(cx - bw / 2, chartBottom, bw, yy - chartBottom, w.v >= STD ? good : bad);
      text(w.v.toFixed(1), cx - font.widthOfTextAtSize(w.v.toFixed(1), 7) / 2, yy + 3, 7, bold, ink);
      text(w.lab, cx - font.widthOfTextAtSize(w.lab, 6.5) / 2, chartBottom - 12, 6.5, font, muted);
    });
    const sy = y(STD);
    page.drawLine({
      start: { x: 48, y: sy },
      end: { x: RIGHT, y: sy },
      thickness: 1,
      color: warn,
      dashArray: [3, 3],
    });
  }
  const s2Bottom = chartBottom - 24;

  // Section 3: Latest score per area/unit
  const s3Head = s2Bottom - 22;
  hline(s3Head + 14);
  text(report.latestTitle || 'Skor terbaru per area', M, s3Head, 10.5, bold, ink);
  text('Standar ' + STD, RIGHT - font.widthOfTextAtSize('Standar ' + STD, 7.5), s3Head, 7.5, font, muted);
  const latest = report.latest;
  const lTop = s3Head - 10;
  const lRows = latest.length ? Math.min(latest.length, 24) : 0;
  const lH = lRows ? Math.max(8, Math.min(14, (lTop - 48) / lRows)) : 12;
  if (!lRows) {
    text('Belum ada audit pada rentang tanggal ini.', M, lTop - 10, 8, font, muted);
  } else {
    const lBarX = 160;
    const lBarW = 300;
    latest.slice(0, lRows).forEach((r, i) => {
      const y = lTop - i * lH;
      text(clip(r.name, 118, 8), M, y, 8, font, ink);
      const v = Math.max(0, Math.min(100, r.v));
      rect(lBarX, y - 1, lBarW, Math.max(4, lH - 5), rgb(0.94, 0.96, 0.98));
      rect(lBarX, y - 1, (v / 100) * lBarW, Math.max(4, lH - 5), v >= STD ? good : bad);
      text(v.toFixed(1), lBarX + lBarW + 6, y, 8, bold, v >= STD ? good : bad);
      text(dateLabel(r.date), 522, y, 7, font, muted);
    });
    const sx = lBarX + (STD / 100) * lBarW;
    page.drawLine({
      start: { x: sx, y: lTop + 4 },
      end: { x: sx, y: lTop - lRows * lH + 2 },
      thickness: 1,
      color: warn,
      dashArray: [3, 3],
    });
    if (latest.length > lRows) text(`+${latest.length - lRows} lainnya`, M, lTop - lRows * lH - 2, 7, font, muted);
  }

  text('Audit Internal - Process Audit Checklist', M, 20, 7, font, muted);
  const pageCount = '1 / 1';
  text(pageCount, RIGHT - font.widthOfTextAtSize(pageCount, 7), 20, 7, font, muted);

  // Kontrak fitur: PDF harus tetap 1 halaman A4.
  const first = doc.getPage(0);
  if (doc.getPageCount() !== 1 || first.getWidth() !== A4.w || first.getHeight() !== A4.h) {
    throw new Error('PDF harus 1 halaman A4.');
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
