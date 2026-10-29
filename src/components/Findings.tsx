'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from './ctx';
import { IconAlert } from './icons';
import type { Filters } from './useFilters';
import { MAXPH_ACTION, STATUSES } from '@/lib/constants';
import { api, compress, download } from '@/lib/client';
import { csvFinds, type FindingExportRow } from '@/lib/csv';
import { dateLabel, today } from '@/lib/format';
import { nl, unitById } from '@/lib/scoring';
import type { Audit, DeptAudit, Finding } from '@/lib/types';

interface Row {
  src: 'p' | 'd';
  aid: string;
  n: number;
  t: string;
  area: string;
  areaId: string;
  date: string;
  createdAt: number;
  f: Finding;
}

export default function Findings({
  audits,
  daudits,
  filters,
  reload,
}: {
  audits: Audit[];
  daudits: DeptAudit[];
  filters: Filters;
  reload: () => void;
}) {
  const { catalog, session, areas, toast, openPhoto } = useApp();
  const router = useRouter();
  const role = session?.role;
  const isDept = /^d/.test(session?.area || '');
  const [busy, setBusy] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState<{ x: Row; key: 'photos' | 'donePhotos'; id: string } | null>(null);

  const resolveArea = (id: string) => areas.find((a) => a.id === id)?.name || id;
  const VA = role === 'prod' ? audits.filter((a) => a.areaId === session?.area) : audits;
  const VD = role === 'prod' ? daudits.filter((a) => a.unit === session?.area) : daudits;

  const out: Row[] = [];
  VA.forEach((a) =>
    Object.entries(a.finds || {}).forEach(([n, f]) => {
      const it = catalog.items.find((i) => i.n === +n);
      out.push({ src: 'p', aid: a.id, n: +n, t: it ? it.t : '', area: a.areaName || resolveArea(a.areaId), areaId: a.areaId, date: a.date, createdAt: a.createdAt, f });
    }),
  );
  VD.forEach((a) => {
    const u = unitById(a.unit);
    Object.entries(a.finds || {}).forEach(([n, f]) => {
      const it = u?.items.find((i) => i.n === +n);
      out.push({ src: 'd', aid: a.id, n: +n, t: it ? it.t : '', area: a.unitName || u?.name || a.unit, areaId: a.unit, date: a.date, createdAt: a.createdAt, f });
    });
  });
  // Default: temuan terbaru di atas (tanggal audit, lalu waktu simpan).
  let list = out.sort(
    (x, y) =>
      y.date.localeCompare(x.date) ||
      (y.createdAt || 0) - (x.createdAt || 0) ||
      (x.f.due || '9999').localeCompare(y.f.due || '9999'),
  );

  const t = today();
  if (filters.fstatus === 'open') list = list.filter((x) => (x.f.status || 'Open') !== 'Closed');
  else if (filters.fstatus === 'overdue') list = list.filter((x) => (x.f.status || 'Open') !== 'Closed' && x.f.due && x.f.due < t);
  else if (filters.fstatus === 'closed') list = list.filter((x) => x.f.status === 'Closed');
  if (filters.farea !== 'all') list = list.filter((x) => x.areaId === filters.farea);
  if (filters.from) list = list.filter((x) => x.date >= filters.from);
  if (filters.to) list = list.filter((x) => x.date <= filters.to);

  const areaOpts: [string, string][] = [];
  if (role === 'prod') {
    if (isDept) catalog.units.filter((u) => u.id === session?.area).forEach((u) => areaOpts.push([u.id, u.name]));
    else areas.filter((a) => a.id === session?.area).forEach((a) => areaOpts.push([a.id, a.name]));
  } else {
    areas.forEach((a) => areaOpts.push([a.id, a.name]));
    catalog.units.forEach((u) => areaOpts.push([u.id, u.dept + ' · ' + u.name]));
  }

  const scopeName = role === 'prod' ? (isDept ? unitById(session?.area || '')?.name || '' : resolveArea(session?.area || '')) : '';

  async function patch(x: Row, patchObj: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/${x.src === 'd' ? 'daudits' : 'audits'}/${x.aid}`, {
        method: 'PATCH',
        body: JSON.stringify({ n: String(x.n), patch: patchObj }),
      });
      toast('Tersimpan');
      reload();
    } catch {
      toast('Gagal menyimpan perubahan.');
    }
    setBusy(false);
  }

  async function removePhoto(x: Row, key: 'photos' | 'donePhotos', id: string) {
    if ((x.f.status || 'Open') === 'Closed') {
      toast('Temuan sudah Closed. Foto tidak dapat dihapus/diganti.');
      return;
    }
    const ids = (x.f[key] || []).filter((p) => p !== id);
    setBusy(true);
    try {
      await api(`/api/${x.src === 'd' ? 'daudits' : 'audits'}/${x.aid}`, {
        method: 'PATCH',
        body: JSON.stringify({ n: String(x.n), patch: { [key]: ids } }),
      });
      await api(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Foto dihapus');
    } catch {
      toast('Gagal menghapus foto.');
    }
    setBusy(false);
    reload();
  }

  async function addPhotos(x: Row, key: 'photos' | 'donePhotos', files: FileList | null) {
    if (!files) return;
    const ids = [...(x.f[key] || [])];
    let saved = 0;
    setBusy(true);
    for (const file of Array.from(files)) {
      if (ids.length >= MAXPH_ACTION) {
        toast('Maksimal ' + MAXPH_ACTION + ' foto per temuan.');
        break;
      }
      try {
        toast('Mengunggah foto…');
        const data = await compress(file);
        const r = await api<{ id: string }>('/api/photos', {
          method: 'POST',
          body: JSON.stringify({ auditId: x.aid, auditSrc: x.src, n: x.n, kind: key, data }),
        });
        ids.push(r.id);
        await api(`/api/${x.src === 'd' ? 'daudits' : 'audits'}/${x.aid}`, {
          method: 'PATCH',
          body: JSON.stringify({ n: String(x.n), patch: { [key]: ids } }),
        });
        saved++;
      } catch {
        toast('Foto gagal diunggah.');
      }
    }
    toast(saved ? 'Foto tersimpan' : 'Tidak ada foto yang tersimpan.');
    setBusy(false);
    reload();
  }

  return (
    <>
      <div>
        <h2>{role === 'prod' ? 'Action Plan · ' + scopeName : 'Tindak Lanjut Temuan'}</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Isi action plan, PIC, dan due date. Foto bukti bisa dihapus/diganti sebelum Closed; setelah Closed foto tidak bisa
          diubah. Skor audit tidak berubah.
        </p>
      </div>

      <div className="filters">
        <label className="f">
          Status
          <select value={filters.fstatus} onChange={(e) => filters.set({ fstatus: e.target.value })}>
            {[['open', 'Belum closed'], ['overdue', 'Lewat due date'], ['closed', 'Closed'], ['all', 'Semua']].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Area / unit
          <select value={filters.farea} onChange={(e) => filters.set({ farea: e.target.value })}>
            <option value="all">Semua</option>
            {areaOpts.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Dari
          <input type="date" value={filters.from} onChange={(e) => filters.set({ from: e.target.value, preset: 'custom' })} />
        </label>
        <label className="f">
          Sampai
          <input type="date" value={filters.to} onChange={(e) => filters.set({ to: e.target.value, preset: 'custom' })} />
        </label>
        {role !== 'prod' && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              const rows: FindingExportRow[] = list.map((x) => ({ date: x.date, area: x.area, n: x.n, t: x.t, finding: x.f.finding, plan: x.f.plan, pic: x.f.pic, due: x.f.due, status: x.f.status, photos: x.f.photos, donePhotos: x.f.donePhotos, closedAt: x.f.closedAt }));
              download('temuan-audit-internal.csv', csvFinds(rows));
            }}
          >
            Unduh CSV temuan
          </button>
        )}
      </div>

      {!list.length && <div className="card empty">Tidak ada temuan pada filter ini.</div>}

      {list.map((x) => {
        const st = x.f.status || 'Open';
        const od = st !== 'Closed' && x.f.due && x.f.due < t;
        const canAddFindingPhoto = role !== 'prod' && st !== 'Closed';
        const canAddDonePhoto = st !== 'Closed';
        const photoBlock = (
          key: 'photos' | 'donePhotos',
          ids: string[] | undefined,
          emptyText: string,
          canUpload: boolean,
          hint?: string,
          removable?: boolean,
          onRemove?: (id: string) => void,
        ) => {
          const urls = (ids || []).map((p) => `/api/photos/${p}`);
          const dk = x.src + x.aid + x.n + ':' + key;
          const photos = urls.length ? (
            <div className="ph-list">
              {urls.map((u, k) => (
                <div className="ph-item" key={u}>
                  <Image
                    className="thumb"
                    src={u}
                    alt="Foto bukti temuan"
                    width={84}
                    height={84}
                    unoptimized
                    onClick={() => openPhoto(urls, k)}
                  />
                  {removable && onRemove && ids?.[k] && (
                    <button
                      type="button"
                      className="ph-x"
                      aria-label="Hapus foto"
                      title="Hapus foto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(ids[k]);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>{emptyText}</span>
          );
          if (!canUpload)
            return (
              <div className="ph-readonly">
                {photos}
                {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
              </div>
            );
          return (
            <div className="ph">
              <div
                className={'ph-drop' + (dragKey === dk ? ' drag' : '')}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragKey(dk);
                }}
                onDragLeave={() => setDragKey((k) => (k === dk ? null : k))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragKey(null);
                  addPhotos(x, key, e.dataTransfer.files);
                }}
              >
                {photos}
              </div>
              <div className="ph-btns" style={{ marginTop: 6 }}>
                <label className="btn ghost sm">
                  Ambil foto
                  <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhotos(x, key, e.target.files)} />
                </label>
                <label className="btn ghost sm">
                  Dari galeri
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(x, key, e.target.files)} />
                </label>
              </div>
              {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
            </div>
          );
        };
        return (
          <article className="card fcard" key={x.src + x.aid + x.n}>
            <div className="hd">
              <b>{x.area}</b>
              <span className="mono muted">#{nl(x.n)}</span>
              <span className="muted">{dateLabel(x.date)}</span>
              <span className={`pill ${st === 'Closed' ? 'good' : od ? 'bad' : st === 'Progress' ? 'warn' : 'na'}`}>{od ? 'Lewat due date' : st}</span>
              {x.f.closedAt && st === 'Closed' && <span className="muted" style={{ fontSize: 12 }}>closed {dateLabel(x.f.closedAt)}</span>}
            </div>
            <div className="muted">{x.t}</div>
            <div className="find">{x.f.finding}</div>
            <div>
              <div className="f" style={{ display: 'block', marginBottom: 6 }}>Foto temuan</div>
              {photoBlock(
                'photos',
                x.f.photos,
                'Tidak ada foto temuan',
                canAddFindingPhoto,
                role === 'prod'
                  ? 'Foto temuan hanya dapat diunggah oleh auditor/admin.'
                  : st === 'Closed'
                    ? 'Temuan sudah Closed. Foto temuan tidak dapat ditambah/diganti lagi.'
                    : 'Klik × pada foto untuk menghapus, lalu unggah foto pengganti.',
                canAddFindingPhoto,
                (id) => setConfirmPhoto({ x, key: 'photos', id }),
              )}
            </div>
            <label className="f">
              Action plan
              <textarea defaultValue={x.f.plan || ''} onBlur={(e) => patch(x, { plan: e.target.value })} />
            </label>
            <div className="fgrid">
              <label className="f">
                PIC
                <input type="text" defaultValue={x.f.pic || ''} onBlur={(e) => patch(x, { pic: e.target.value })} />
              </label>
              <label className="f">
                Due date
                <input type="date" defaultValue={x.f.due || ''} onBlur={(e) => patch(x, { due: e.target.value })} />
              </label>
              <label className="f">
                Status
                <select
                  value={st}
                  onChange={(e) => {
                    if (e.target.value === 'Closed' && !(x.f.donePhotos || []).length) {
                      toast('Unggah foto bukti action plan dulu sebelum Closed.');
                      reload();
                      return;
                    }
                    patch(x, { status: e.target.value, closedAt: e.target.value === 'Closed' ? today() : '' });
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <div className="f" style={{ display: 'block', marginBottom: 6 }}>Bukti action plan (wajib sebelum Closed)</div>
              {photoBlock(
                'donePhotos',
                x.f.donePhotos,
                'Belum ada bukti.',
                canAddDonePhoto,
                st === 'Closed'
                  ? 'Temuan sudah Closed. Foto bukti tidak dapat ditambah/diganti lagi.'
                  : 'Klik × pada foto untuk menghapus, lalu unggah foto pengganti.',
                canAddDonePhoto,
                (id) => setConfirmPhoto({ x, key: 'donePhotos', id }),
              )}
            </div>
          </article>
        );
      })}

      {role === 'prod' && (
        <div className="muted" style={{ fontSize: 12 }}>
          Anda dapat mengisi action plan dan mengunggah foto bukti sendiri.{' '}
          <button className="btn ghost sm" type="button" onClick={() => router.push(isDept ? '/departemen' : '/dashboard')}>
            Kembali ke tren
          </button>
        </div>
      )}
      {confirmPhoto && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-photo-title">
          <div className="modal-card">
            <span className="modal-ic">
              <IconAlert size={22} />
            </span>
            <h3 id="confirm-photo-title">{confirmPhoto.key === 'photos' ? 'Hapus foto temuan?' : 'Hapus bukti action plan?'}</h3>
            <p className="muted">Foto yang dihapus tidak dapat dikembalikan. Pastikan foto ini memang salah.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" type="button" onClick={() => setConfirmPhoto(null)}>
                Batal
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={busy}
                onClick={() => {
                  const target = confirmPhoto;
                  setConfirmPhoto(null);
                  removePhoto(target.x, target.key, target.id);
                }}
              >
                Hapus foto
              </button>
            </div>
          </div>
        </div>
      )}
      {busy && <div className="toast">Menyimpan…</div>}
    </>
  );
}
