'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useApp } from './ctx';
import { IconClose, IconEdit } from './icons';
import { api, compress } from '@/lib/client';
import { MAXPH, MAXPH_ACTION, PRODUCT_SECTIONS, STATUSES } from '@/lib/constants';
import { cls, dateLabel, fmt, today } from '@/lib/format';
import { calc, cmp, inSec, nl, unitById, unitSecs, withCalc } from '@/lib/scoring';
import type { Answer, Audit, DeptAudit, Finding } from '@/lib/types';

const hasAns = (a: Audit | DeptAudit) => !!a.ans && Object.keys(a.ans).length > 0;
const num = (v: string) => {
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function ScoreField({
  name,
  weight,
  value,
  onChange,
  total,
}: {
  name: string;
  weight: number;
  value: string;
  onChange: (v: string) => void;
  total?: boolean;
}) {
  const ratio = total ? null : weight ? Math.max(0, Math.min(1, Number(value || 0) / weight)) : null;
  return (
    <label className={`score-field${total ? ' total' : ''}`}>
      <span className="score-name">
        {name} <span className="muted">/{+weight.toFixed(1)}</span>
      </span>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      {ratio != null && (
        <span className="score-bar">
          <i style={{ width: `${ratio * 100}%`, background: `var(--${ratio >= 0.95 ? 'good' : ratio >= 0.85 ? 'warn' : 'bad'}-fill)` }} />
        </span>
      )}
    </label>
  );
}

interface Form {
  date: string;
  areaId: string;
  unit: string;
  auditor: string;
  auditee: string;
  total: string;
  sec: Record<string, string>;
  cats: string[];
  ans: Record<string, Answer>;
  finds: Record<string, Finding>;
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
  const [pending, setPending] = useState<Record<number, Partial<Record<'photos' | 'donePhotos', string[]>>>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [farea, setFarea] = useState('all');
  const role = session?.role;

  const isDept = (a: Audit | DeptAudit): a is DeptAudit => 'unit' in a;
  const all = [...audits, ...daudits].map(withCalc).sort((a, b) => -cmp(a, b));
  const list = all.filter((a) => {
    if (from && a.date < from) return false;
    if (to && a.date > to) return false;
    if (farea !== 'all') {
      const [kind, id] = farea.split(':');
      if (kind === 'p' ? isDept(a) || a.areaId !== id : !isDept(a) || a.unit !== id) return false;
    }
    return true;
  });
  const detail = all.find((a) => a.id === detailId) || null;
  const secsOf = (a: Audit | DeptAudit, unit: string) =>
    isDept(a) ? unitSecs(unitById(unit) || unitById(a.unit) || catalog.units[0]) : PRODUCT_SECTIONS;
  const itemsOf = (a: Audit | DeptAudit, unit: string) => (isDept(a) ? unitById(unit)?.items || [] : catalog.items);
  const previewTotal = detail && form && hasAns(detail) ? calc(form.ans, secsOf(detail, form.unit)).total : null;
  const filtered = !!(from || to || farea !== 'all');

  if (!all.length)
    return (
      <>
        <h2>Riwayat Audit</h2>
        <div className="card empty">Belum ada audit tersimpan.</div>
      </>
    );

  const label = (a: Audit | DeptAudit) => {
    if (!isDept(a)) return a.areaName || a.areaId;
    const u = unitById(a.unit);
    const name = a.unitName || u?.name || a.unit;
    const dept = a.dept || u?.dept;
    return dept && dept !== name ? `${dept} · ${name}` : name;
  };

  function closeDetail() {
    setDetailId(null);
    setEditing(false);
    setForm(null);
    setPending({});
    setRemoved([]);
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
      ans: { ...(detail.ans || {}) },
      finds: JSON.parse(JSON.stringify(detail.finds || {})) as Record<string, Finding>,
    };
    setPending({});
    setRemoved([]);
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

  function patchFinding(n: number, patchObj: Partial<Finding>) {
    if (!form) return;
    setForm({
      ...form,
      finds: { ...form.finds, [n]: { ...(form.finds[n] || {}), ...patchObj } },
    });
  }

  function setAnswer(n: number, v: Answer) {
    if (!form) return;
    const finds = { ...form.finds };
    if (v === 'DM' && !finds[n]) {
      finds[n] = { finding: '', plan: '', pic: '', due: '', status: 'Open', photos: [], donePhotos: [] };
    }
    setForm({ ...form, ans: { ...form.ans, [n]: v }, finds });
  }

  async function addPhotoData(n: number, kind: 'photos' | 'donePhotos', files: FileList | null) {
    if (!form || !files) return;
    const max = kind === 'photos' ? MAXPH : MAXPH_ACTION;
    const existing = (form.finds[n]?.[kind] || []).length;
    const arr = [...(pending[n]?.[kind] || [])];
    setBusy(true);
    for (const file of Array.from(files)) {
      if (existing + arr.length >= max) {
        toast('Maksimal ' + max + ' foto.');
        break;
      }
      try {
        arr.push(await compress(file));
      } catch {
        toast('Foto tidak bisa diproses.');
      }
    }
    setPending((p) => ({ ...p, [n]: { ...(p[n] || {}), [kind]: arr } }));
    setBusy(false);
  }

  function removeExistingPhoto(n: number, kind: 'photos' | 'donePhotos', id: string) {
    if (!form) return;
    const f = form.finds[n] || {};
    setRemoved((r) => [...new Set([...r, id])]);
    setForm({
      ...form,
      finds: { ...form.finds, [n]: { ...f, [kind]: (f[kind] || []).filter((x) => x !== id) } },
    });
  }

  function removePendingPhoto(n: number, kind: 'photos' | 'donePhotos', index: number) {
    setPending((p) => {
      const arr = [...(p[n]?.[kind] || [])];
      arr.splice(index, 1);
      return { ...p, [n]: { ...(p[n] || {}), [kind]: arr } };
    });
  }

  function photoEditor(n: number, kind: 'photos' | 'donePhotos') {
    if (!form) return null;
    const f = form.finds[n] || {};
    const existing = f[kind] || [];
    const drafts = pending[n]?.[kind] || [];
    const status = f.status || 'Open';
    const canAdd = kind === 'photos' || status !== 'Closed';
    const existingUrls = existing.map((p) => `/api/photos/${p}`);
    const allUrls = [...existingUrls, ...drafts];
    return (
      <div className="ph">
        <div className="ph-list">
          {existing.map((p, k) => (
            <div className="ph-item" key={p}>
              <Image
                className="thumb"
                src={`/api/photos/${p}`}
                alt="Foto temuan"
                width={84}
                height={84}
                unoptimized
                onClick={() => openPhoto(allUrls, k)}
              />
              <button type="button" className="ph-x" aria-label="Hapus foto" onClick={() => removeExistingPhoto(n, kind, p)}>
                ×
              </button>
            </div>
          ))}
          {drafts.map((src, k) => (
            <div className="ph-item" key={'draft-' + k}>
              <Image
                className="thumb"
                src={src}
                alt="Foto baru"
                width={84}
                height={84}
                unoptimized
                onClick={() => openPhoto(allUrls, existing.length + k)}
              />
              <button type="button" className="ph-x" aria-label="Hapus foto" onClick={() => removePendingPhoto(n, kind, k)}>
                ×
              </button>
            </div>
          ))}
        </div>
        {canAdd ? (
          <div className="ph-btns">
            <label className="btn ghost sm">
              Ambil foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  addPhotoData(n, kind, e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="btn ghost sm">
              Dari galeri
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addPhotoData(n, kind, e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            Status Closed. Ubah ke Open/Progress dulu untuk menambah bukti.
          </span>
        )}
      </div>
    );
  }

  async function save() {
    if (!detail || !form) return;
    const dept = isDept(detail);
    setBusy(true);
    const uploaded: string[] = [];
    const finds = JSON.parse(JSON.stringify(form.finds)) as Record<string, Finding>;
    try {
      for (const [n, groups] of Object.entries(pending)) {
        for (const kind of ['photos', 'donePhotos'] as const) {
          for (const data of groups[kind] || []) {
            const r = await api<{ id: string }>('/api/photos', {
              method: 'POST',
              body: JSON.stringify({ auditId: detail.id, auditSrc: dept ? 'd' : 'p', n: +n, kind, data }),
            });
            uploaded.push(r.id);
            finds[n] = { ...(finds[n] || {}), [kind]: [...(finds[n]?.[kind] || []), r.id] };
          }
        }
      }
      const fields: Record<string, unknown> = {
        date: form.date,
        auditor: form.auditor.trim(),
        auditee: form.auditee.trim(),
        finds,
      };
      if (dept) {
        const u = unitById(form.unit);
        fields.unit = form.unit;
        fields.unitName = u?.name || form.unit;
        fields.dept = u?.dept || '';
        if (hasAns(detail)) fields.ans = form.ans;
        else fields.score = { total: num(form.total), dm: (detail.score as { dm?: number } | undefined)?.dm ?? 0, cats: form.cats.map(num) };
      } else {
        fields.areaId = form.areaId;
        fields.areaName = areas.find((a) => a.id === form.areaId)?.name || form.areaId;
        if (hasAns(detail)) {
          fields.ans = form.ans;
        } else {
          const score: Record<string, number | null> = { total: num(form.total), dm: (detail.score as { dm?: number } | undefined)?.dm ?? 0 };
          PRODUCT_SECTIONS.forEach((s) => (score[s.k] = num(form.sec[s.k])));
          fields.score = score;
        }
      }
      await api(`/api/${dept ? 'daudits' : 'audits'}/${detail.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
      for (const id of removed) await api(`/api/photos/${id}`, { method: 'DELETE' }).catch(() => {});
      toast('Perubahan tersimpan');
      setEditing(false);
      setForm(null);
      setPending({});
      setRemoved([]);
      reload();
    } catch {
      for (const id of uploaded) await api(`/api/photos/${id}`, { method: 'DELETE' }).catch(() => {});
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
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {filtered ? `${list.length} dari ${all.length} audit` : `${list.length} audit tersimpan`}.
        </p>
      </div>
      <div className="filters">
        <label className="f">
          Dari
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="f">
          Sampai
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="f">
          Area / unit
          <select value={farea} onChange={(e) => setFarea(e.target.value)}>
            <option value="all">Semua area / unit</option>
            <optgroup label="Produksi">
              {areas.map((a) => (
                <option key={'p:' + a.id} value={'p:' + a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Departemen">
              {catalog.units.map((u) => (
                <option key={'d:' + u.id} value={'d:' + u.id}>
                  {u.dept === u.name ? u.name : `${u.dept} · ${u.name}`}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button
          className="btn ghost"
          type="button"
          disabled={!filtered}
          onClick={() => {
            setFrom('');
            setTo('');
            setFarea('all');
          }}
        >
          Reset filter
        </button>
      </div>
      {!list.length && <div className="card empty">Tidak ada audit pada filter ini.</div>}
      {!!list.length && (
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
      )}

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
                                {u.dept === u.name ? u.name : `${u.dept} · ${u.name}`}
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
                    <div className="edit-title">Temuan, action plan &amp; bukti</div>
                    {!Object.keys(form.finds).length && <div className="muted">Belum ada temuan.</div>}
                    {Object.entries(form.finds)
                      .sort(([a], [b]) => +a - +b)
                      .map(([n, f]) => {
                        const it = itemsOf(detail, form.unit).find((i) => i.n === +n);
                        const status = f.status || 'Open';
                        return (
                          <div className="find-edit" key={n}>
                            <div className="cl-title">
                              <span className="cl-num">#{nl(+n)}</span>
                              <span>{it?.t || 'Poin tambahan'}</span>
                            </div>
                            <label className="f">
                              Keterangan temuan
                              <textarea value={f.finding || ''} onChange={(e) => patchFinding(+n, { finding: e.target.value })} />
                            </label>
                            <label className="f">
                              Action plan
                              <textarea value={f.plan || ''} onChange={(e) => patchFinding(+n, { plan: e.target.value })} />
                            </label>
                            <div className="edit-grid">
                              <label className="f">
                                PIC
                                <input value={f.pic || ''} onChange={(e) => patchFinding(+n, { pic: e.target.value })} />
                              </label>
                              <label className="f">
                                Due date
                                <input type="date" value={f.due || ''} onChange={(e) => patchFinding(+n, { due: e.target.value })} />
                              </label>
                              <label className="f">
                                Status
                                <select
                                  value={status}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    patchFinding(+n, { status: v, closedAt: v === 'Closed' ? f.closedAt || today() : '' });
                                  }}
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="f" style={{ display: 'block' }}>Foto temuan</div>
                            {photoEditor(+n, 'photos')}
                            <div className="f" style={{ display: 'block' }}>Bukti action plan (wajib sebelum Closed)</div>
                            {photoEditor(+n, 'donePhotos')}
                          </div>
                        );
                      })}
                  </div>

                  <div className="edit-section">
                    <div className="edit-title">
                      {hasAns(detail) ? `Jawaban tiap poin · skor ${fmt(previewTotal)}` : 'Skor'}
                    </div>
                    {hasAns(detail) ? (
                      <div className="ans-list">
                        {secsOf(detail, form.unit).map((s) => {
                          const items = itemsOf(detail, form.unit).filter((i) => inSec(i, s));
                          if (!items.length) return null;
                          return (
                            <div key={s.k} className="ans-group">
                              <div className="ans-gtitle">{s.name}</div>
                              {items.map((i) => (
                                <div className="ans-row" key={i.n}>
                                  <span className="num">{nl(i.n)}</span>
                                  <span className="ans-t">{i.t}</span>
                                  <span className="ans-seg">
                                    {(['M', 'DM', 'NA'] as const).map((v) => (
                                      <button
                                        key={v}
                                        type="button"
                                        className={form.ans[i.n] === v ? `on on-${v}` : ''}
                                        onClick={() => setAnswer(i.n, v)}
                                      >
                                        {v === 'NA' ? 'N/A' : v}
                                      </button>
                                    ))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="edit-grid">
                        {isDept(detail)
                          ? (unitById(form.unit)?.cats || []).map((c, i) => (
                              <ScoreField
                                key={i}
                                name={c.name}
                                weight={c.w}
                                value={form.cats[i] || ''}
                                onChange={(v) => {
                                  const cats = [...form.cats];
                                  cats[i] = v;
                                  setForm({ ...form, cats });
                                }}
                              />
                            ))
                          : PRODUCT_SECTIONS.map((s) => (
                              <ScoreField
                                key={s.k}
                                name={s.name}
                                weight={s.w}
                                value={form.sec[s.k] || ''}
                                onChange={(v) => setForm({ ...form, sec: { ...form.sec, [s.k]: v } })}
                              />
                            ))}
                        <ScoreField name="Total" weight={100} value={form.total} onChange={(v) => setForm({ ...form, total: v })} total />
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
                      setPending({});
                      setRemoved([]);
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
                      <div key={n} className="find-detail">
                        <div className="cl-title">
                          <span className="cl-num">#{nl(+n)}</span>
                          <span>{it ? it.t : 'Poin tambahan'}</span>
                        </div>
                        <div className="find" style={{ background: 'var(--bad-bg)', padding: '6px 10px', borderRadius: 6, marginTop: 3 }}>
                          {f.finding}
                        </div>
                        {(f.plan || f.pic || f.due || f.status) && (
                          <div className="muted" style={{ fontSize: 12, display: 'grid', gap: 2 }}>
                            {f.plan && (
                              <div>
                                <b>Action plan:</b> {f.plan}
                              </div>
                            )}
                            <div>
                              {f.pic && <>PIC: {f.pic} · </>}
                              {f.due && <>Due: {dateLabel(f.due)} · </>}
                              Status: {f.status || 'Open'}
                              {f.closedAt ? ` · closed ${dateLabel(f.closedAt)}` : ''}
                            </div>
                          </div>
                        )}
                        {(f.photos || []).length > 0 && (
                          <>
                            <div className="f" style={{ display: 'block', marginTop: 6 }}>Foto temuan</div>
                            <div className="ph-list" style={{ marginTop: 4 }}>
                              {(f.photos || []).map((p, k) => (
                                <Image
                                  key={p}
                                  className="thumb"
                                  src={`/api/photos/${p}`}
                                  alt="Foto temuan"
                                  width={84}
                                  height={84}
                                  unoptimized
                                  onClick={() => openPhoto((f.photos || []).map((x) => `/api/photos/${x}`), k)}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        {(f.donePhotos || []).length > 0 && (
                          <>
                            <div className="f" style={{ display: 'block', marginTop: 6 }}>Bukti action plan</div>
                            <div className="ph-list" style={{ marginTop: 4 }}>
                              {(f.donePhotos || []).map((p, k) => (
                                <Image
                                  key={p}
                                  className="thumb"
                                  src={`/api/photos/${p}`}
                                  alt="Bukti action plan"
                                  width={84}
                                  height={84}
                                  unoptimized
                                  onClick={() => openPhoto((f.donePhotos || []).map((x) => `/api/photos/${x}`), k)}
                                />
                              ))}
                            </div>
                          </>
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
