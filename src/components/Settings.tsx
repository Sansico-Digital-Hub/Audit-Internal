'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';
import { IconClose } from './icons';
import { api, now } from '@/lib/client';
import { clLabel, clSecOpts } from '@/lib/catalog';
import { CUSTOM_BASE, ROLE_LABEL } from '@/lib/constants';
import { nl, unitSecs } from '@/lib/scoring';
import type { CustomItem, Role } from '@/lib/types';

export function AreasView({ areas, reload }: { areas: { id: string; name: string }[]; reload: () => void }) {
  const { toast } = useApp();
  const [draft, setDraft] = useState<{ id: string; name: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const focusRef = useRef<string | null>(null);
  const list = draft ?? areas;
  const query = q.trim().toLowerCase();
  const shown = list.filter((a) => !query || a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query));

  useEffect(() => {
    const id = focusRef.current;
    if (!id) return;
    const el = document.getElementById('area-input-' + id) as HTMLInputElement | null;
    if (!el) return;
    focusRef.current = null;
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [list]);

  function edit(id: string, name: string) {
    setDraft((d) => (d ?? areas).map((a) => (a.id === id ? { ...a, name } : a)));
  }
  function remove(id: string) {
    setDraft((d) => (d ?? areas).filter((a) => a.id !== id));
  }
  function add() {
    const id = 'ar' + now().toString(36);
    setQ('');
    focusRef.current = id;
    setDraft((d) => [...(d ?? areas), { id, name: '' }]);
  }

  async function save() {
    const clean = list.map((a) => ({ id: a.id, name: a.name.trim() })).filter((a) => a.name);
    if (!clean.length) {
      toast('Minimal satu area harus punya nama.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/config/areas', { method: 'PUT', body: JSON.stringify({ list: clean }) });
      toast('Daftar area tersimpan');
      setDraft(null);
      reload();
    } catch {
      toast('Gagal menyimpan daftar area.');
    }
    setBusy(false);
  }

  return (
    <>
      <div>
        <h2>Daftar Area</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Tambah, ubah nama, atau hapus area produksi. Perubahan berlaku untuk form dan dashboard; audit lama tetap tersimpan.
        </p>
      </div>
      <section className="card pnl">
        <div className="area-toolbar">
          <input
            type="search"
            className="area-search"
            value={q}
            placeholder="Cari area..."
            aria-label="Cari area"
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="area-count">{shown.length} area</span>
          <button className="btn ghost sm" type="button" onClick={add}>
            + Tambah area
          </button>
        </div>
        {!shown.length && <div className="empty">Tidak ada area yang cocok.</div>}
        <div className="area-list">
          {shown.map((a) => {
            const index = list.findIndex((x) => x.id === a.id);
            return (
              <div className="area-item" key={a.id}>
                <span className="area-num">{index + 1}</span>
                <input
                  id={'area-input-' + a.id}
                  type="text"
                  className="area-name"
                  value={a.name}
                  placeholder={`Nama area ${index + 1}`}
                  aria-label={`Nama area ${index + 1}`}
                  onChange={(e) => edit(a.id, e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn area-del"
                  aria-label="Hapus area"
                  onClick={() => remove(a.id)}
                  disabled={list.length <= 1}
                >
                  <IconClose />
                </button>
              </div>
            );
          })}
        </div>
        <div className="area-foot">
          <span>
            {list.length} area produksi · urutan ini dipakai di form dan dashboard.
          </span>
          <div className="area-foot-actions">
            <span className={`pill ${draft ? 'warn' : 'good'}`}>{draft ? 'Belum disimpan' : 'Tersimpan'}</span>
            {draft && (
              <button className="btn ghost sm" type="button" onClick={() => setDraft(null)}>
                Batal
              </button>
            )}
            <button className="btn sm" type="button" disabled={busy || !draft} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function CustomItemsView() {
  const { catalog, session, setup, toast, refresh } = useApp();
  const [scope, setScope] = useState('p');
  const [sec, setSec] = useState('product');
  const [t, setT] = useState('');
  const [r, setR] = useState('');
  const [edit, setEdit] = useState<string | null>(null);
  const [et, setEt] = useState('');
  const [er, setEr] = useState('');
  const [busy, setBusy] = useState(false);
  const [bscope, setBscope] = useState('p');
  const [bq, setBq] = useState('');
  const [bsec, setBsec] = useState('all');
  const [bedit, setBedit] = useState<number | null>(null);
  const [bt, setBt] = useState('');
  const [br, setBr] = useState('');

  if (session?.role !== 'admin' && !setup)
    return <div className="card empty">Hanya admin yang bisa mengatur poin checklist.</div>;

  const opts = clSecOpts(catalog, scope);
  const bunit = bscope === 'p' ? null : catalog.units.find((u) => u.id === bscope);
  const bsecs = bunit ? unitSecs(bunit) : catalog.sections;
  const baseItems = bscope === 'p' ? catalog.items : bunit?.items || [];
  const secOf = (n: number) => bsecs.find((s) => (n >= s.from && n <= s.to) || (s.extra || []).includes(n));
  const bqLow = bq.trim().toLowerCase();
  const shownBase = baseItems.filter((it) => {
    if (bsec !== 'all' && secOf(it.n)?.k !== bsec) return false;
    if (!bqLow) return true;
    return (nl(it.n) + ' ' + it.t + ' ' + it.r).toLowerCase().includes(bqLow);
  });
  const list = [...catalog.custom].sort(
    (a, b) => (a.scope === 'p' ? '0' : '1' + a.scope).localeCompare(b.scope === 'p' ? '0' : '1' + b.scope) || a.n - b.n,
  );

  async function put(next: CustomItem[], msg: string) {
    setBusy(true);
    try {
      await api('/api/config/customitems', { method: 'PUT', body: JSON.stringify({ list: next }) });
      toast(msg);
      refresh();
    } catch {
      toast('Gagal menyimpan poin checklist.');
    }
    setBusy(false);
  }

  function startBaseEdit(n: number, text: string, ref: string) {
    setBedit(n);
    setBt(text);
    setBr(ref);
  }

  async function saveBase() {
    if (bedit == null) return;
    setBusy(true);
    try {
      await api('/api/config/itemoverrides', { method: 'PUT', body: JSON.stringify({ scope: bscope, n: bedit, t: bt, r: br }) });
      toast('Poin diperbarui');
      setBedit(null);
      refresh();
    } catch {
      toast('Gagal menyimpan poin.');
    }
    setBusy(false);
  }

  async function saveWeight(n: number, raw: string) {
    const value = raw.trim();
    if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      toast('Bobot poin harus angka ≥ 0.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/config/itemoverrides', { method: 'PUT', body: JSON.stringify({ scope: bscope, n, w: value }) });
      toast('Bobot poin diperbarui');
      refresh();
    } catch {
      toast('Gagal menyimpan bobot poin.');
    }
    setBusy(false);
  }

  async function add() {
    const text = t.trim();
    const ref = r.trim();
    if (!text) {
      toast('Isi teks poin audit.');
      return;
    }
    if (!opts.some((o) => o[0] === sec)) {
      toast('Pilih seksi atau kategori.');
      return;
    }
    const next = catalog.custom.slice();
    const n = Math.max(CUSTOM_BASE, ...next.filter((e) => e.scope === scope).map((e) => e.n)) + 1;
    next.push({ n, scope, sec, t: text, r: ref, active: true, createdAt: now() });
    setT('');
    setR('');
    await put(next, 'Poin ditambahkan: ' + nl(n));
  }

  async function act(kind: 'edit' | 'cancel' | 'save' | 'toggle', key: string) {
    const i = key.lastIndexOf(':');
    const sc = key.slice(0, i);
    const n = +key.slice(i + 1);
    const next = catalog.custom.map((e) => ({ ...e }));
    const e = next.find((x) => x.scope === sc && x.n === n);
    if (!e) return;
    if (kind === 'edit') {
      setEdit(key);
      setEt(e.t);
      setEr(e.r || '');
      return;
    }
    if (kind === 'cancel') {
      setEdit(null);
      return;
    }
    if (kind === 'save') {
      const text = et.trim();
      if (!text) {
        toast('Teks poin tidak boleh kosong.');
        return;
      }
      e.t = text;
      e.r = er.trim();
      setEdit(null);
      await put(next, 'Poin diperbarui');
      return;
    }
    if (kind === 'toggle') {
      e.active = e.active === false;
      await put(next, e.active ? 'Poin diaktifkan' : 'Poin dinonaktifkan');
    }
  }

  return (
    <>
      <div>
        <h2>Poin Checklist Tambahan</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Tambah poin audit sendiri ke area produksi atau unit departemen. Poin baru muncul di form audit berikutnya, ditandai
          &quot;Tambahan&quot; dengan nomor T1, T2, dan seterusnya. Bobot tiap seksi tetap; bobot poin mengatur pengaruh relatif
          antarpoin dalam seksi yang sama. Kosongkan bobot untuk memakai pembagian otomatis.
        </p>
      </div>
      <section className="card pnl">
        <h3>Edit poin yang sudah ada</h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Ubah teks, acuan, atau bobot poin. Bobot baru dipakai audit berikutnya; audit lama tetap memakai skor tersimpan
          sampai dihitung ulang atau diisi skor manual di Riwayat.
        </p>
        <label className="f" style={{ maxWidth: 360 }}>
          Untuk
          <select
            value={bscope}
            onChange={(e) => {
              setBscope(e.target.value);
              setBsec('all');
              setBedit(null);
            }}
          >
            <optgroup label="Produksi">
              <option value="p">Audit Proses Produksi</option>
            </optgroup>
            <optgroup label="Departemen lain">
              {catalog.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.dept === u.name ? u.name : `${u.dept} · ${u.name}`}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="cl-tools">
          <label className="f">
            Cari poin
            <input type="search" value={bq} placeholder="Nomor, teks, atau acuan" onChange={(e) => setBq(e.target.value)} />
          </label>
          <label className="f">
            Seksi
            <select value={bsec} onChange={(e) => setBsec(e.target.value)}>
              <option value="all">Semua seksi</option>
              {bsecs.map((s) => (
                <option key={s.k} value={s.k}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="cl-count muted">
            {shownBase.length} dari {baseItems.length} poin
          </span>
        </div>
        <div className="cl-list">
          {!shownBase.length && <div className="empty">Tidak ada poin yang cocok dengan pencarian.</div>}
          {shownBase.map((it) => {
            const ed = bedit === it.n;
            return (
              <div className={'clrow' + (ed ? ' editing' : '')} key={it.n}>
                <div>
                  <div className="cl-title">
                    <span className="cl-num">{nl(it.n)}</span>
                    {secOf(it.n) && <span className="pill na">{secOf(it.n)!.name}</span>}
                    {it.custom && <span className="pill warn">Tambahan</span>}
                  </div>
                  {ed ? (
                    <div className="cl-edit">
                      <label className="f">
                        Poin audit
                        <textarea value={bt} onChange={(e) => setBt(e.target.value)} />
                      </label>
                      <label className="f">
                        Acuan pemeriksaan (satu baris satu acuan)
                        <textarea value={br} onChange={(e) => setBr(e.target.value)} />
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="cl-text">{it.t}</div>
                      {it.r && <div className="cl-ref">{it.r}</div>}
                    </>
                  )}
                </div>
                <div className="acts">
                  <label className="weight-field" title="Bobot relatif poin dalam seksi. Kosong = otomatis/sama rata.">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      defaultValue={it.w != null ? String(it.w) : ''}
                      placeholder="Bobot"
                      onBlur={(e) => saveWeight(it.n, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </label>
                  {it.custom ? (
                    <span className="muted" style={{ fontSize: 12 }}>edit di daftar tambahan</span>
                  ) : ed ? (
                    <>
                      <button className="btn sm" type="button" disabled={busy} onClick={saveBase}>
                        Simpan
                      </button>
                      <button className="btn ghost sm" type="button" onClick={() => setBedit(null)}>
                        Batal
                      </button>
                    </>
                  ) : (
                    <button className="btn ghost sm" type="button" onClick={() => startBaseEdit(it.n, it.t, it.r)}>
                      Ubah
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card pnl">
        <h3>Tambah poin baru</h3>
        <div className="meta" style={{ padding: 0 }}>
          <label className="f">
            Untuk
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setSec(clSecOpts(catalog, e.target.value)[0]?.[0] || '');
              }}
            >
              <optgroup label="Produksi">
                <option value="p">Audit Proses Produksi (17 area)</option>
              </optgroup>
              <optgroup label="Departemen lain">
                {catalog.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.dept} · {u.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="f">
            Seksi / kategori
            <select value={sec} onChange={(e) => setSec(e.target.value)}>
              {opts.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="f">
          Poin audit
          <textarea value={t} placeholder="Tulis poin yang diperiksa, mis. Area bebas dari kebocoran oli" onChange={(e) => setT(e.target.value)} />
        </label>
        <label className="f">
          Acuan pemeriksaan (opsional, satu baris satu acuan)
          <textarea
            value={r}
            placeholder={'mis.\n1. Cek lantai di sekitar mesin\n2. Tidak ada tetesan oli'}
            onChange={(e) => setR(e.target.value)}
          />
        </label>
        <div>
          <button className="btn" type="button" disabled={busy} onClick={add}>
            Tambah poin
          </button>
        </div>
      </section>

      <section className="card pnl">
        <h3>Poin tambahan yang ada ({list.length})</h3>
        {!list.length && <div className="empty">Belum ada poin tambahan.</div>}
        <div className="cl-list">
          {list.map((e) => {
            const key = e.scope + ':' + e.n;
            const off = e.active === false;
            const ed = edit === key;
            return (
              <div className={'clrow' + (ed ? ' editing' : '')} key={key}>
                <div>
                  <div className="cl-title">
                    <span className="cl-num">{nl(e.n)}</span>
                    <span className={`pill ${off ? 'na' : 'good'}`}>{off ? 'Nonaktif' : 'Aktif'}</span>
                  </div>
                  {ed ? (
                    <div className="cl-edit">
                      <label className="f">
                        Poin audit
                        <textarea value={et} onChange={(ev) => setEt(ev.target.value)} />
                      </label>
                      <label className="f">
                        Acuan pemeriksaan
                        <textarea value={er} onChange={(ev) => setEr(ev.target.value)} />
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="cl-text">{e.t}</div>
                      <div className="cl-ref">
                        {clLabel(catalog, e)}
                        {e.r ? '\n' + e.r : ''}
                      </div>
                    </>
                  )}
                </div>
                <div className="acts">
                  {ed ? (
                    <>
                      <button className="btn sm" type="button" onClick={() => act('save', key)}>
                        Simpan
                      </button>
                      <button className="btn ghost sm" type="button" onClick={() => act('cancel', key)}>
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn ghost sm" type="button" onClick={() => act('edit', key)}>
                        Ubah
                      </button>
                      <button className="btn ghost sm" type="button" onClick={() => act('toggle', key)}>
                        {off ? 'Aktifkan' : 'Nonaktifkan'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Poin yang dinonaktifkan hilang dari form berikutnya, tetapi jawaban di audit lama tetap dihitung dan tampil di riwayat.
        </div>
      </section>
    </>
  );
}

export function AccessView() {
  const { access, envManaged, scopePins, areas, catalog, session, setup, toast, refresh } = useApp();
  const [rolePins, setRolePins] = useState<Record<string, string>>({ prod: '', auditor: '', admin: '' });
  const [scopeEdits, setScopeEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (session?.role !== 'admin' && !setup)
    return <div className="card empty">Hanya admin yang bisa mengatur akses.</div>;

  async function save() {
    setBusy(true);
    try {
      await api('/api/config/access', { method: 'PUT', body: JSON.stringify({ ...rolePins, scopePins: scopeEdits }) });
      toast('PIN tersimpan');
      setRolePins({ prod: '', auditor: '', admin: '' });
      setScopeEdits({});
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
    setBusy(false);
  }

  const anyEnv = envManaged.admin || envManaged.prod || envManaged.auditor;

  const scopeRows = (list: { id: string; name: string }[]) =>
    list.map((s) => {
      const has = !!scopePins[s.id];
      const clearing = scopeEdits[s.id] === '';
      return (
        <div className="scope-row" key={s.id}>
          <span className="scope-name">{s.name}</span>
          <span className={`pill ${has ? 'good' : 'na'}`}>{has ? (clearing ? 'akan dihapus' : 'ada PIN') : 'ikut PIN Produksi'}</span>
          <input
            type="password"
            autoComplete="off"
            value={scopeEdits[s.id] ?? ''}
            placeholder={has ? 'PIN baru' : 'PIN khusus (opsional)'}
            onChange={(e) => setScopeEdits((p) => ({ ...p, [s.id]: e.target.value }))}
          />
          {has && !clearing && (
            <button type="button" className="btn ghost sm" onClick={() => setScopeEdits((p) => ({ ...p, [s.id]: '' }))}>
              Hapus PIN
            </button>
          )}
          {clearing && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() =>
                setScopeEdits((p) => {
                  const n = { ...p };
                  delete n[s.id];
                  return n;
                })
              }
            >
              Batal hapus
            </button>
          )}
        </div>
      );
    });

  return (
    <>
      <div>
        <h2>Akses dan PIN</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Atur PIN tiap peran dan tiap area/unit. Hanya admin yang bisa mengubah. Kosongkan kolom yang tidak ingin diubah.
        </p>
      </div>
      <section className="card pnl">
        {anyEnv && (
          <div className="banner" style={{ marginTop: 0 }}>
            PIN di environment tersedia sebagai cadangan, tetapi PIN yang diatur di sini (disimpan di database) yang dipakai.
          </div>
        )}
        <h3>PIN per peran</h3>
        <div className="meta" style={{ padding: 0 }}>
          {(['prod', 'auditor', 'admin'] as Role[]).map((r) => (
            <label className="f" key={r}>
              <span className="lbl">
                PIN {ROLE_LABEL[r]}{' '}
                {access[r] ? <span className="pill good">sudah diatur</span> : <span className="pill bad">belum diatur</span>}
              </span>
              <input
                type="password"
                autoComplete="off"
                placeholder="PIN baru"
                value={rolePins[r]}
                onChange={(e) => setRolePins({ ...rolePins, [r]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <h3>PIN per area produksi</h3>
        <div className="scope-list">{scopeRows(areas)}</div>

        <h3>PIN per unit departemen</h3>
        <div className="scope-list">
          {scopeRows(catalog.units.map((u) => ({ id: u.id, name: u.dept === u.name ? u.name : `${u.dept} · ${u.name}` })))}
        </div>

        <div>
          <button className="btn" type="button" disabled={busy} onClick={save}>
            Simpan PIN
          </button>
        </div>
      </section>
    </>
  );
}
