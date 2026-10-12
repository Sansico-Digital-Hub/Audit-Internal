'use client';

import { Fragment, useState } from 'react';
import { useApp } from './ctx';
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
  const [expand, setExpand] = useState<Record<string, boolean>>({});
  const role = session?.role;
  const list = [...audits, ...daudits].map(withCalc).sort((a, b) => -cmp(a, b));

  if (!list.length)
    return (
      <>
        <h2>Riwayat Audit</h2>
        <div className="card empty">Belum ada audit tersimpan.</div>
      </>
    );

  async function del(id: string, isD: boolean) {
    if (role !== 'admin') {
      toast('Hanya admin yang bisa menghapus audit.');
      return;
    }
    if (confirmDel !== id) {
      setConfirmDel(id);
      return;
    }
    setConfirmDel(null);
    try {
      await api(`/api/${isD ? 'daudits' : 'audits'}/${id}`, { method: 'DELETE' });
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
                const isD = 'unit' in a;
                const open = expand[a.id];
                const label = isD
                  ? `${a.dept} · ${a.unitName || unitById((a as DeptAudit).unit)?.name || (a as DeptAudit).unit}`
                  : (a as Audit).areaName || (a as Audit).areaId;
                return (
                  <Fragment key={a.id}>
                    <tr>
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn ghost sm" onClick={() => setExpand({ ...expand, [a.id]: !open })}>
                          {open ? 'Tutup' : 'Detail'}
                        </button>{' '}
                        {role === 'admin' &&
                          (confirmDel === a.id ? (
                            <button className="btn danger sm" onClick={() => del(a.id, isD)}>
                              Yakin hapus?
                            </button>
                          ) : (
                            <button className="btn ghost sm" onClick={() => del(a.id, isD)}>
                              Hapus
                            </button>
                          ))}
                      </td>
                    </tr>
                    {open && (
                      <tr key={a.id + '-d'}>
                        <td colSpan={7} className="detail">
                          <div className="hist-detail">
                            <div className="parts">
                              {a.c.secs.map((s, i) => (
                                <span key={i}>
                                  {s.name} <b>{fmt(s.pts)}</b>/{+s.w.toFixed(1)} {a.ans ? ` (${s.m} M, ${s.d} DM, ${s.na} N/A)` : ''}
                                </span>
                              ))}
                            </div>
                            {Object.keys(a.finds || {}).length ? (
                              Object.entries(a.finds).map(([n, f]) => {
                                const it = isD ? unitById((a as DeptAudit).unit)?.items.find((i) => i.n === +n) : catalog.items.find((i) => i.n === +n);
                                return (
                                  <div key={n}>
                                    <b className="mono">#{nl(+n)}</b> {it ? it.t : ''}
                                    <div className="find" style={{ background: 'var(--bad-bg)', padding: '6px 10px', borderRadius: 6, marginTop: 3 }}>{f.finding}</div>
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
