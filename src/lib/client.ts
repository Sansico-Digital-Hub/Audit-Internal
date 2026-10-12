'use client';

import type { Answer } from './types';

export interface Draft {
  date: string;
  auditor: string;
  auditee: string;
  areaId?: string;
  unitId?: string;
  ans: Record<number, Answer>;
  find: Record<number, string>;
  photos: Record<number, string[]>;
}

export const DKEY = 'audit-internal-draft-v2';
export const DKEYD = 'audit-internal-draft-dept-v2';

export function newForm(): Draft {
  return { date: todayStr(), auditor: '', auditee: '', areaId: 'a1', ans: {}, find: {}, photos: {} };
}
export function newDForm(): Draft {
  return { date: todayStr(), auditor: '', auditee: '', unitId: 'd1', ans: {}, find: {}, photos: {} };
}

export const now = () => Date.now();

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function loadDraft<T extends Draft>(key: string, mk: () => T): T {
  try {
    const r = localStorage.getItem(key);
    if (r) {
      const f = JSON.parse(r);
      if (f && f.ans) return { ...mk(), ...f };
    }
  } catch {
    /* ignore */
  }
  return mk();
}

let draftTimer: ReturnType<typeof setTimeout> | undefined;
export function saveDraft(key: string, data: Draft) {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      try {
        localStorage.setItem(key, JSON.stringify({ ...data, photos: {} }));
      } catch {
        /* ignore */
      }
    }
  }, 300);
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function compress(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let max = 1280;
      let out = '';
      for (let k = 0; k < 4; k++) {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r);
        c.height = Math.round(img.height * r);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.72, 0.55, 0.4]) {
          out = c.toDataURL('image/jpeg', q);
          if (out.length < 230000) {
            URL.revokeObjectURL(url);
            return res(out);
          }
        }
        max = Math.round(max * 0.75);
      }
      URL.revokeObjectURL(url);
      rej(new Error('too big'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error('bad image'));
    };
    img.src = url;
  });
}

export async function api<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((data as { error?: string })?.error || 'Gagal'), { status: r.status });
  return data as T;
}

export function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
