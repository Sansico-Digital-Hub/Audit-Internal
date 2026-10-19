'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from './ctx';
import { IconChevron } from './icons';
import { MAXPH } from '@/lib/constants';
import { api, compress, clearDraft, DKEY, DKEYD, loadDraft, newDForm, newForm, now, saveDraft, type Draft } from '@/lib/client';
import { calc, nl, unitSecs } from '@/lib/scoring';
import type { Answer, Item, Section, Unit } from '@/lib/types';

export default function InputForm({ mode }: { mode: 'p' | 'd' }) {
  const { catalog, areas, toast, refresh } = useApp();
  const router = useRouter();
  const [pform, setPform] = useState<Draft>(() => loadDraft(DKEY, newForm));
  const [dform, setDform] = useState<Draft>(() => loadDraft(DKEYD, newDForm));
  const [bad, setBad] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [dragN, setDragN] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Beri ruang bawah pada konten setinggi sticky bar agar item terakhir tak tertutup (mobile).
  useEffect(() => {
    const set = () => {
      const h = barRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty('--sticky-h', h + 'px');
    };
    set();
    const t = setTimeout(set, 300);
    window.addEventListener('resize', set);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', set);
      document.documentElement.style.removeProperty('--sticky-h');
    };
  }, []);

  const isD = mode === 'd';
  const form = isD ? dform : pform;
  const setForm = isD ? setDform : setPform;
  const unit: Unit | undefined = catalog.units.find((u) => u.id === dform.unitId) || catalog.units[0];
  const sections: Section[] = isD ? unitSecs(unit) : catalog.sections;
  const allItems: Item[] = isD ? unit.items : catalog.items;
  const items = allItems.filter((i) => !i.off);
  // Default setiap poin = M (hijau) sampai user mengubahnya.
  const ans: Record<string, Answer> = {};
  items.forEach((i) => (ans[i.n] = 'M'));
  Object.assign(ans, form.ans);
  const c = calc(ans, sections);
  const inSec = (i: Item, s: Section) => (i.n >= s.from && i.n <= s.to) || (s.extra || []).includes(i.n);

  const key = isD ? DKEYD : DKEY;
  function update(patch: Partial<Draft>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(key, next);
      return next;
    });
  }
  function setAnswer(n: number, v: Answer) {
    setBad((b) => ({ ...b, [n]: false }));
    update({ ans: { ...form.ans, [n]: v } });
  }
  async function addPhotos(n: number, files: FileList | null) {
    if (!files) return;
    const arr = form.photos[n] ? [...form.photos[n]] : [];
    for (const file of Array.from(files)) {
      if (arr.length >= MAXPH) {
        toast('Maksimal ' + MAXPH + ' foto per temuan.');
        break;
      }
      try {
        arr.push(await compress(file));
      } catch {
        toast('Foto tidak bisa diproses.');
      }
    }
    update({ photos: { ...form.photos, [n]: arr } });
  }
  function removePhoto(n: number, i: number) {
    const arr = [...(form.photos[n] || [])];
    arr.splice(i, 1);
    update({ photos: { ...form.photos, [n]: arr } });
  }

  async function save() {
    if (!form.date || !form.auditor.trim() || !form.auditee.trim()) {
      toast('Lengkapi tanggal, auditor, dan auditee.');
      return;
    }
    const miss: number[] = [];
    items.forEach((i) => {
      const a = ans[i.n];
      const badItem = !a || (a === 'DM' && (!(form.find[i.n] || '').trim() || !(form.photos[i.n] || []).length));
      if (badItem) miss.push(i.n);
    });
    if (miss.length) {
      const nextBad: Record<number, boolean> = {};
      miss.forEach((n) => (nextBad[n] = true));
      setBad(nextBad);
      toast(`${miss.length} poin belum lengkap. DM wajib temuan dan foto (nomor ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? '…' : ''}).`);
      return;
    }
    const cc = calc(ans, sections);
    const finds: Record<string, { finding: string; plan: string; pic: string; due: string; status: string; photos: string[] }> = {};
    items.forEach((i) => {
      if (ans[i.n] === 'DM') finds[i.n] = { finding: (form.find[i.n] || '').trim(), plan: '', pic: '', due: '', status: 'Open', photos: [] };
    });

    const id = isD
      ? `${form.date}_${unit!.id}_${now().toString(36)}`
      : `${form.date}_${form.areaId}_${now().toString(36)}`;
    const src = isD ? 'd' : 'p';

    setBusy(true);
    try {
      const totalPhotos = Object.keys(finds).reduce((s, n) => s + (form.photos[+n] || []).length, 0);
      let done = 0;
      for (const n of Object.keys(finds)) {
        for (const data of form.photos[+n] || []) {
          done++;
          toast(`Mengunggah foto ${done}/${totalPhotos}…`);
          const r = await api<{ id: string }>('/api/photos', {
            method: 'POST',
            body: JSON.stringify({ auditId: id, auditSrc: src, n: +n, kind: 'photos', data }),
          });
          finds[n].photos.push(r.id);
        }
      }

      let body: Record<string, unknown>;
      if (isD) {
        body = {
          id,
          unit: unit!.id,
          unitName: unit!.name,
          dept: unit!.dept,
          date: form.date,
          auditor: form.auditor.trim(),
          auditee: form.auditee.trim(),
          ans,
          finds,
          score: { total: +cc.total!.toFixed(2), dm: cc.dm, cats: cc.secs.map((s) => +(s.pts ?? 0).toFixed(2)) },
          createdAt: now(),
        };
      } else {
        body = {
          id,
          date: form.date,
          areaId: form.areaId,
          areaName: areas.find((a) => a.id === form.areaId)?.name,
          auditor: form.auditor.trim(),
          auditee: form.auditee.trim(),
          ans,
          finds,
          score: {
            total: +cc.total!.toFixed(2),
            product: +(cc.secs[0].pts ?? 0).toFixed(2),
            process: +(cc.secs[1].pts ?? 0).toFixed(2),
            system: +(cc.secs[2].pts ?? 0).toFixed(2),
            area: +(cc.secs[3].pts ?? 0).toFixed(2),
            dm: cc.dm,
          },
          createdAt: now(),
        };
      }
      await api(isD ? '/api/daudits' : '/api/audits', { method: 'POST', body: JSON.stringify(body) });

      clearDraft(key);
      const keep = { auditor: form.auditor, auditee: form.auditee };
      if (isD) setDform({ ...newDForm(), ...keep, unitId: unit!.id });
      else setPform({ ...newForm(), ...keep });
      setBad({});
      toast(`Tersimpan: ${isD ? unit!.name : areas.find((a) => a.id === form.areaId)?.name} · skor ${cc.total!.toFixed(1)}`);
      refresh();
      router.push(isD ? '/departemen' : '/dashboard');
    } catch {
      toast('Gagal menyimpan (cek koneksi). Coba lagi.');
    }
    setBusy(false);
  }

  return (
    <>
      <div>
        <h2>{isD ? 'Form Audit Departemen' : 'Form Audit Proses Produksi'}</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {isD ? 'Pilih unit' : 'Pilih area'}, isi {items.length} poin. Poin DM wajib diisi keterangan temuan dan foto. Action plan diisi oleh {isD ? 'unit terkait' : 'produksi'}.
        </p>
      </div>
      <section className="card">
        <div className="meta">
          <label className="f">
            Tanggal
            <input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
          </label>
          {isD ? (
            <label className="f">
              Unit / departemen
              <select
                value={unit!.id}
                onChange={(e) => setDform({ ...newDForm(), auditor: dform.auditor, auditee: dform.auditee, unitId: e.target.value })}
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
              <select value={form.areaId} onChange={(e) => update({ areaId: e.target.value })}>
                {areas.map((a, i) => (
                  <option key={a.id} value={a.id}>
                    {i + 1}. {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="f">
            Auditor
            <input type="text" value={form.auditor} placeholder="mis. Pande & Putri" onChange={(e) => update({ auditor: e.target.value })} />
          </label>
          <label className="f">
            Auditee
            <input type="text" value={form.auditee} placeholder="mis. Bayu, Budi" onChange={(e) => update({ auditee: e.target.value })} />
          </label>
        </div>
        <div className="legend">
          <span>
            <b>M</b> = Meet, sesuai, tidak ada temuan
          </span>
          <span>
            <b>DM</b> = Does not Meet, ada temuan
          </span>
          <span>
            <b>N/A</b> = tidak berlaku, tidak dihitung
          </span>
        </div>
      </section>

      {sections.map((s, si) => (
        <section className="card sec" key={s.k} id={'sec-' + s.k}>
          <div className="sec-h">
            <div>
              <div className="pol">{s.pol}</div>
              <h3>
                {s.name} <span className="muted" style={{ fontWeight: 400 }}>· bobot {+s.w.toFixed(1)}</span>
              </h3>
            </div>
            <div className="sc">
              {c.secs[si].pts == null
                ? 'belum dinilai'
                : `${c.secs[si].m} M · ${c.secs[si].d} DM${c.secs[si].na ? ` · ${c.secs[si].na} N/A` : ''} → ${c.secs[si].pts!.toFixed(1)} / ${+s.w.toFixed(1)}`}
            </div>
          </div>
          {items.filter((i) => inSec(i, s)).map((i) => {
            const a = ans[i.n];
            return (
              <div className={'item' + (bad[i.n] ? ' bad-field' : '')} key={i.n} id={'it-' + i.n}>
                <div className="item-head">
                  <span className="num">{nl(i.n)}</span>
                  <div className="req">
                    {i.t}
                    {i.custom && <span className="pill na" style={{ marginLeft: 4 }}>Tambahan</span>}
                  </div>
                  <div className="seg" role="radiogroup" aria-label={'Penilaian poin ' + i.n}>
                    {(['M', 'DM', 'NA'] as Answer[]).map((v) => (
                      <button key={v} type="button" role="radio" data-v={v} aria-checked={a === v} onClick={() => setAnswer(i.n, v)}>
                        {v === 'NA' ? 'N/A' : v}
                      </button>
                    ))}
                  </div>
                </div>
                {i.r && (
                  <details className="ref">
                    <summary>
                      Acuan pemeriksaan
                      <IconChevron />
                    </summary>
                    <ul>
                      {i.r.split('\n').filter((x) => x.trim()).map((x, k) => (
                        <li key={k}>{x.trim()}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="dm" hidden={a !== 'DM'}>
                  <label className="f">
                    Keterangan temuan
                    <textarea
                      value={form.find[i.n] || ''}
                      placeholder="Keterangan temuan: apa, di mana, kondisi aktual"
                      onChange={(e) => update({ find: { ...form.find, [i.n]: e.target.value } })}
                    />
                  </label>
                  <div className="ph">
                    <div className="f" style={{ display: 'block' }}>Foto bukti temuan (wajib, maks {MAXPH})</div>
                    <div
                      className={'ph-drop' + (dragN === i.n ? ' drag' : '')}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragN(i.n);
                      }}
                      onDragLeave={() => setDragN((d) => (d === i.n ? null : d))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragN(null);
                        addPhotos(i.n, e.dataTransfer.files);
                      }}
                    >
                      <div className="ph-list">
                        {(form.photos[i.n] || []).map((u, k) => (
                          <div className="ph-item" key={k}>
                            <Image className="thumb" src={u} alt={'Foto temuan ' + i.n} width={84} height={84} unoptimized />
                            <button type="button" className="ph-x" aria-label="Hapus foto" onClick={() => removePhoto(i.n, k)}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {!(form.photos[i.n] || []).length && (
                        <span className="muted" style={{ fontSize: 12 }}>Tarik &amp; lepas foto ke sini, atau pakai tombol di bawah</span>
                      )}
                    </div>
                    <div className="ph-btns">
                      <label className="btn ghost sm">
                        Ambil foto
                        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhotos(i.n, e.target.files)} />
                      </label>
                      <label className="btn ghost sm">
                        Pilih dari galeri
                        <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(i.n, e.target.files)} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <div className="sticky-bar" ref={barRef}>
        <div className="sticky-in">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="big mono" style={{ color: c.total == null ? undefined : `var(--${c.total >= 95 ? 'good' : c.total >= 85 ? 'warn' : 'bad'})` }}>
                {c.total == null ? '–' : c.total.toFixed(1)}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {c.answered}/{items.length} terisi · {c.dm} temuan DM · standar 95
              </div>
            </div>
            <div className="parts">
              {c.secs.map((s, i) => (
                <span key={i}>
                  {sections[i].name} <b>{s.pts == null ? '–' : s.pts.toFixed(1)}</b>/{+sections[i].w.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                const keep = { auditor: form.auditor, auditee: form.auditee };
                if (isD) setDform({ ...newDForm(), ...keep, unitId: unit!.id });
                else setPform({ ...newForm(), ...keep });
                clearDraft(key);
                setBad({});
                toast('Form dikosongkan');
              }}
            >
              Kosongkan
            </button>
            <button className="btn" type="button" disabled={busy} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan hasil audit'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
