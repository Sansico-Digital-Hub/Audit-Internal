'use client';

import { useState } from 'react';
import { useApp } from './ctx';
import { IconClose, IconEdit } from './icons';
import { api } from '@/lib/client';
import { PRODUCT_SECTIONS } from '@/lib/constants';
import { cls, dateLabel, fmt } from '@/lib/format';
import { cmp, nl, unitById, withCalc } from '@/lib/scoring';
import type { Audit, DeptAudit } from '@/lib/types';

const hasAns = (a: Audit | DeptAudit) => !!a.ans && Object.keys(a.ans).length > 0;
const num = (v: string) => {
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

interface Form {
  date: string;
  areaId: string;
  unit: string;
  auditor: string;
  auditee: string;
  total: string;
  sec: Record<string, string>;
  cats: string[];
}

export default function History({
  audits,
  daudits,
  reload,
}: {
  audits: Audit[];
  daudits: DeptAudit[];
  reload: () => void;
}) {
  const { catalog, session, areas, toast, openPhoto } = useApp();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
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

  const label = (a: Audit | DeptAudit) =>
    isDept(a) ? `${a.dept} · ${a.unitName || unitById(a.unit)?.name || a.unit}` : a.areaName || a.areaId;

  function closeDetail() {
    setDetailId(null);
    setEditing(false);
    setForm(null);
  }

  function startEdit() {
    if (!detail) return;
    const dept = isDept(detail);
    const f: Form = {
      date: detail.date,
      areaId: dept ? '' : (detail as Audit).areaId,
      unit: dept ? (detail as DeptAudit).unit : '',
      auditor: detail.auditor,
      auditee: detail.auditee,
      total: detail.c.total != null ? String(+detail.c.total.toFixed(1)) : '',
      sec: {},
      cats: [],
    };
    if (!dept) {
      PRODUCT_SECTIONS.forEach((s) => {
        const p = (detail.score as Record<string, number> | undefined)?.[s.k];
        f.sec[s.k] = p != null ? String(p) : '';
      });
    } else {
      const u = unitById(f.unit);
      const cats = (detail.score?.cats as number[] | undefined) || [];
      f.cats = (u?.cats || []).map((_, i) => (cats[i] != null ? String(cats[i]) : ''));
    }
    setForm(f);
    setEditing(true);
  }

  async function save() {
    if (!detail || !form) return;
    const dept = isDept(detail);
    const fields: Record<string, unknown> = { date: form.date, auditor: form.auditor.trim(), auditee: form.auditee.trim() };
    if (dept) {
      const u = unitById(form.unit);
      fields.unit = form.unit;
      fields.unitName = u?.name || form.unit;
      fields.dept = u?.dept || '';
      if (!hasAns(detail)) fields.score = { total: num(form.total), dm: (detail.score as { dm?: number } | undefined)?.dm ?? 0, cats: form.cats.map(num) };
    } else {
      fields.areaId = form.areaId;
      fields.areaName = areas.find((a) => a.id === form.areaId)?.name || form.areaId;
      if (!hasAns(detail)) {
        const score: Record<string, number | null> = { total: num(form.total), dm: (detail.score as { dm?: number } | undefined)?.dm ?? 0 };
        PRODUCT_SECTIONS.forEach((s) => (score[s.k] = num(form.sec[s.k])));
        fields.score = score;
      }
    }
    setBusy(true);
    try {
      await api(`/api/${dept ? 'daudits' : 'audits'}/${detail.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
      toast('Perubahan tersimpan');
      setEditing(false);
      setForm(null);
      reload();
    } catch {
      toast('Gagal menyimpan.');
    }
    setBusy(false);
  }

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
    if (detailId === id) closeDetail();
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
                return (
                  <tr key={a.id}>
                    <td data-l="Tanggal">{dateLabel(a.date)}</td>
                    <td data-l="Area">
                      <b>{label(a)}</b>
                    </td>
                    <td data-l="Auditor">{a.auditor}</td>
                    <td data-l="Auditee">{a.auditee}</td>
                    <td data-l="Skor">
                      <span className={`pill ${cls(a.c.total)} mono`}>{fmt(a.c.total)}</span>
                    </td>
                    <td data-l="DM" className="n mono">{a.c.dm}</td>
                    <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          setDetailId(a.id);
                          setEditing(false);
                          setForm(null);
                        }}
                      >
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
          <button className="drawer-scrim" aria-label="Tutup detail" onClick={closeDetail} />
          <aside className="drawer open" aria-label="Detail audit">
            <div className="drawer-head">
              <div style={{ minWidth: 0 }}>
                <b>{label(detail)}</b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {dateLabel(detail.date)} · {detail.auditor} → {detail.auditee} · skor {fmt(detail.c.total)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!editing && (
                  <button className="btn sm" onClick={startEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconEdit size={16} /> Edit
                  </button>
                )}
                <button className="icon-btn" onClick={closeDetail} aria-label="Tutup">
                  <IconClose />
                </button>
              </div>
            </div>

            {editing && form ? (
              <>
                <div className="drawer-body">
                  <div className="edit-section">
                    <div className="edit-title">Identitas</div>
                    <div className="edit-grid">
                      <label className="f">
                        Tanggal
                        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                      </label>
                      {isDept(detail) ? (
                        <label className="f">
                          Unit
                          <select
                            value={form.unit}
                            onChange={(e) => {
                              const u = unitById(e.target.value);
                              setForm({ ...form, unit: e.target.value, cats: (u?.cats || []).map(() => '') });
                            }}
                          >
                            {catalog.units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.dept} · {u.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="f">
                          Area
                          <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
                            {areas.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="f">
                        Auditor
                        <input value={form.auditor} onChange={(e) => setForm({ ...form, auditor: e.target.value })} />
                      </label>
                      <label className="f">
                        Auditee
                        <input value={form.auditee} onChange={(e) => setForm({ ...form, auditee: e.target.value })} />
                      </label>
                    </div>
                  </div>

                  <div className="edit-section">
                    <div className="edit-title">Skor {hasAns(detail) ? '· dari jawaban poin' : ''}</div>
                    {!hasAns(detail) ? (
                      <div className="edit-grid">
                        {isDept(detail)
                          ? (unitById(form.unit)?.cats || []).map((c, i) => (
                              <label className="f" key={i}>
                                {c.name} ({+c.w.toFixed(1)})
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={form.cats[i] || ''}
                                  onChange={(e) => {
                                    const cats = [...form.cats];
                                    cats[i] = e.target.value;
                                    setForm({ ...form, cats });
                                  }}
                                />
                              </label>
                            ))
                          : PRODUCT_SECTIONS.map((s) => (
                              <label className="f" key={s.k}>
                                {s.name} ({s.w})
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={form.sec[s.k] || ''}
                                  onChange={(e) => setForm({ ...form, sec: { ...form.sec, [s.k]: e.target.value } })}
                                />
                              </label>
                            ))}
                        <label className="f">
                          Total
                          <input type="number" inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                        </label>
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: 13 }}>
                        Skor dihitung dari jawaban tiap poin, jadi tidak diedit di sini.
                      </div>
                    )}
                  </div>
                </div>
                <div className="drawer-foot">
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setEditing(false);
                      setForm(null);
                    }}
                  >
                    Batal
                  </button>
                  <button className="btn" disabled={busy} onClick={save}>
                    {busy ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </>
            ) : (
              <div className="drawer-body">
                <div className="parts">
                  {detail.c.secs.map((s, i) => (
                    <span key={i}>
                      {s.name} <b>{fmt(s.pts)}</b>/{+s.w.toFixed(1)}
                      {hasAns(detail) ? ` (${s.m} M, ${s.d} DM, ${s.na} N/A)` : ''}
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
            )}
          </aside>
        </>
      )}
    </>
  );
}
