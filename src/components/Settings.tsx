'use client';

import { useState } from 'react';
import { useApp } from './ctx';
import { api, now } from '@/lib/client';
import { clLabel, clSecOpts } from '@/lib/catalog';
import { CUSTOM_BASE, ROLE_LABEL } from '@/lib/constants';
import { nl } from '@/lib/scoring';
import type { CustomItem, Role } from '@/lib/types';

export function AreasView({ areas, reload }: { areas: { id: string; name: string }[]; reload: () => void }) {
  const { toast } = useApp();
  const [override, setOverride] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const valueOf = (a: { id: string; name: string }) => override[a.id] ?? a.name;

  async function save() {
    setBusy(true);
    try {
      await api('/api/config/areas', {
        method: 'PUT',
        body: JSON.stringify({ list: areas.map((a) => ({ id: a.id, name: valueOf(a).trim() || a.id })) }),
      });
      toast('Nama area tersimpan');
      setOverride({});
      reload();
    } catch {
      toast('Gagal menyimpan nama area.');
    }
    setBusy(false);
  }

  return (
    <>
      <div>
        <h2>Daftar Area</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Sesuaikan nama area dengan area produksi sebenarnya. Perubahan nama berlaku untuk form dan dashboard, audit lama tetap tersimpan.
        </p>
      </div>
      <section className="card pnl">
        <div className="meta" style={{ padding: 0 }}>
          {areas.map((a, i) => (
            <label className="f" key={a.id}>
              Area {i + 1}
              <input
                type="text"
                value={valueOf(a)}
                onChange={(e) => setOverride((o) => ({ ...o, [a.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div>
          <button className="btn" type="button" disabled={busy} onClick={save}>
            Simpan nama area
          </button>
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

  if (session?.role !== 'admin' && !setup)
    return <div className="card empty">Hanya admin yang bisa mengatur poin checklist.</div>;

  const opts = clSecOpts(catalog, scope);
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
          &quot;Tambahan&quot; dengan nomor T1, T2, dan seterusnya. Audit yang sudah tersimpan tidak berubah. Bobot tiap seksi tetap,
          skor seksi = M ÷ (M + DM) × bobot, jadi poin baru ikut menentukan persentase seksi yang dipilih.
        </p>
      </div>
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
        {list.map((e) => {
          const key = e.scope + ':' + e.n;
          const off = e.active === false;
          const ed = edit === key;
          return (
            <div className="clrow" key={key}>
              <div>
                <div>
                  <b className="mono">{nl(e.n)}</b>{' '}
                  <span className={`pill ${off ? 'na' : 'good'}`}>{off ? 'Nonaktif' : 'Aktif'}</span>{' '}
                  <span className="muted" style={{ fontSize: 12 }}>{clLabel(catalog, e)}</span>
                </div>
                {ed ? (
                  <>
                    <label className="f" style={{ marginTop: 6 }}>
                      Poin audit
                      <textarea value={et} onChange={(ev) => setEt(ev.target.value)} />
                    </label>
                    <label className="f" style={{ marginTop: 6 }}>
                      Acuan pemeriksaan
                      <textarea value={er} onChange={(ev) => setEr(ev.target.value)} />
                    </label>
                  </>
                ) : (
                  <>
                    <div style={{ marginTop: 4 }}>{e.t}</div>
                    {e.r && (
                      <div className="muted" style={{ fontSize: 12, whiteSpace: 'pre-line' }}>
                        {e.r}
                      </div>
                    )}
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
        <div className="muted" style={{ fontSize: 12 }}>
          Poin yang dinonaktifkan hilang dari form berikutnya, tetapi jawaban di audit lama tetap dihitung dan tampil di riwayat.
        </div>
      </section>
    </>
  );
}

export function AccessView() {
  const { access, session, setup, envManaged, toast, refresh } = useApp();
  const [pins, setPins] = useState<Record<string, string>>({ prod: '', auditor: '', admin: '' });
  const [busy, setBusy] = useState(false);

  if (session?.role !== 'admin' && !setup)
    return <div className="card empty">Hanya admin yang bisa mengatur akses.</div>;

  async function save() {
    setBusy(true);
    try {
      await api('/api/config/access', { method: 'PUT', body: JSON.stringify(pins) });
      toast('PIN tersimpan');
      setPins({ prod: '', auditor: '', admin: '' });
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
    setBusy(false);
  }

  const envKeys: Record<string, string> = { prod: 'PIN_PRODUKSI', auditor: 'PIN_AUDITOR', admin: 'PIN_ADMIN' };
  const anyEnv = envManaged.admin || envManaged.prod || envManaged.auditor;
  const allEnv = envManaged.admin && envManaged.prod && envManaged.auditor;

  return (
    <>
      <div>
        <h2>Akses dan PIN</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Kosongkan kolom yang tidak ingin diubah. Anggota tim mengganti peran hanya dengan PIN ini. Ini pembatas akses di aplikasi,
          bukan pengganti pengaturan server. Bagikan tautan hanya ke orang di lingkungan kerja.
        </p>
      </div>
      <section className="card pnl">
        {anyEnv && (
          <div className="banner" style={{ marginTop: 0 }}>
            Sebagian PIN diatur melalui environment server (tidak bisa diubah dari sini). Hapus variabel terkait bila ingin mengaturnya dari halaman ini.
          </div>
        )}
        <div className="meta" style={{ padding: 0 }}>
          {(['prod', 'auditor', 'admin'] as Role[]).map((r) => (
            <label className="f" key={r}>
              <span className="lbl">
                PIN {ROLE_LABEL[r]}{' '}
                {envManaged[r] ? (
                  <span className="pill na">via {envKeys[r]}</span>
                ) : access[r] ? (
                  <span className="pill good">sudah diatur</span>
                ) : (
                  <span className="pill bad">belum diatur</span>
                )}
              </span>
              <input
                type="password"
                autoComplete="off"
                placeholder={envManaged[r] ? `Diatur via ${envKeys[r]}` : 'PIN baru'}
                value={pins[r]}
                disabled={envManaged[r]}
                onChange={(e) => setPins({ ...pins, [r]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div>
          <button className="btn" type="button" disabled={busy || allEnv} onClick={save}>
            Simpan PIN
          </button>
        </div>
      </section>
    </>
  );
}
