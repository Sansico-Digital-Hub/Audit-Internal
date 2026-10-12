'use client';

import { useState } from 'react';
import { useApp } from './ctx';
import { IconClose } from './icons';
import { api } from '@/lib/client';
import { cls, dateLabel, fmt } from '@/lib/format';
import { cmp, nl, unitById, withCalc } from '@/lib/scoring';
import type { Audit, DeptAudit } from '@/lib/types';

export default function History({
  audits,
  daudits,
  reload,
}: {
  audits: Audit[];
  daudits: DeptAudit[];
  reload: () => void;
}) {
  const { catalog, session, toast, openPhoto } = useApp();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const role = session?.role;

  const list = [...audits, ...daudits].map(withCalc).sort((a, b) => -cmp(a, b));
  const detail = list.find((a) => a.id === detailId) || null;
  const isDept = (a: Audit | DeptAudit): a is DeptAudit => 'unit' in a;

  if (!list.length)
    return (
      <>
        <h2>Riwayat Audit</h2>
        <div className="card empty">Belum ada audit tersimpan.</div>
      </>
    );

  async function del(id: string, dept: boolean) {
    if (role !== 'admin') {
      toast('Hanya admin yang bisa menghapus audit.');
      return;
    }
    if (confirmDel !== id) {
      setConfirmDel(id);
      return;
    }
    setConfirmDel(null);
    if (detailId === id) setDetailId(null);
    try {
      await api(`/api/${dept ? 'daudits' : 'audits'}/${id}`, { method: 'DELETE' });
      toast('Audit dihapus');
      reload();
    } catch {
      toast('Gagal menghapus.');
    }
  }

  return (
    <>
      <div>
        <h2>Riwayat Audit</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>{list.length} audit tersimpan.</p>
      </div>
      <section className="card pnl">
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Area</th>
                <th>Auditor</th>
                <th>Auditee</th>
                <th>Skor</th>
                <th className="n">DM</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const dept = isDept(a);
                const label = dept
                  ? `${a.dept} · ${a.unitName || unitById(a.unit)?.name || a.unit}`
                  : a.areaName || a.areaId;
                return (
                  <tr key={a.id}>
                    <td data-l="Tanggal">{dateLabel(a.date)}</td>
                    <td data-l="Area">
                      <b>{label}</b>
                    </td>
                    <td data-l="Auditor">{a.auditor}</td>
                    <td data-l="Auditee">{a.auditee}</td>
                    <td data-l="Skor">
                      <span className={`pill ${cls(a.c.total)} mono`}>{fmt(a.c.total)}</span>
                    </td>
                    <td data-l="DM" className="n mono">{a.c.dm}</td>
                    <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn ghost sm" onClick={() => setDetailId(a.id)}>
                        Detail
                      </button>{' '}
                      {role === 'admin' &&
                        (confirmDel === a.id ? (
                          <button className="btn danger sm" onClick={() => del(a.id, dept)}>
                            Yakin hapus?
                          </button>
                        ) : (
                          <button className="btn ghost sm" onClick={() => del(a.id, dept)}>
                            Hapus
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <>
          <button className="drawer-scrim" aria-label="Tutup detail" onClick={() => setDetailId(null)} />
          <aside className="drawer open" aria-label="Detail audit">
            <div className="drawer-head">
              <div style={{ minWidth: 0 }}>
                <b>
                  {isDept(detail)
                    ? `${detail.dept} · ${detail.unitName || unitById(detail.unit)?.name || detail.unit}`
                    : detail.areaName || detail.areaId}
                </b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {dateLabel(detail.date)} · {detail.auditor} → {detail.auditee} · skor {fmt(detail.c.total)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setDetailId(null)} aria-label="Tutup">
                <IconClose />
              </button>
            </div>
            <div className="drawer-body">
              <div className="parts">
                {detail.c.secs.map((s, i) => (
                  <span key={i}>
                    {s.name} <b>{fmt(s.pts)}</b>/{+s.w.toFixed(1)}
                    {detail.ans && Object.keys(detail.ans).length ? ` (${s.m} M, ${s.d} DM, ${s.na} N/A)` : ''}
                  </span>
                ))}
              </div>
              {Object.keys(detail.finds || {}).length ? (
                Object.entries(detail.finds).map(([n, f]) => {
                  const it = isDept(detail)
                    ? unitById(detail.unit)?.items.find((i) => i.n === +n)
                    : catalog.items.find((i) => i.n === +n);
                  return (
                    <div key={n}>
                      <b className="mono">#{nl(+n)}</b> {it ? it.t : ''}
                      <div className="find" style={{ background: 'var(--bad-bg)', padding: '6px 10px', borderRadius: 6, marginTop: 3 }}>
                        {f.finding}
                      </div>
                      {(f.photos || []).length > 0 && (
                        <div className="ph-list" style={{ marginTop: 6 }}>
                          {(f.photos || []).map((p) => (
                            <img key={p} className="thumb" src={`/api/photos/${p}`} alt="Foto temuan" onClick={() => openPhoto(`/api/photos/${p}`)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="muted">Tidak ada temuan.</div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
