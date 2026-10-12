'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { defaultPath } from '@/lib/nav';
import { SEED_UNITS } from '@/lib/seed-data';
import type { Role } from '@/lib/types';

interface Cfg {
  setup: boolean;
  areas: { id: string; name: string }[];
}

const SHORT: Record<Role, string> = { prod: 'Produksi', auditor: 'Auditor', admin: 'Admin' };

export default function Login() {
  const router = useRouter();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [cfgErr, setCfgErr] = useState('');
  const [lrole, setLrole] = useState<Role>('prod');
  const [pin, setPin] = useState('');
  const [area, setArea] = useState('a1');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(async (r) => {
        const c = await r.json().catch(() => ({}));
        if (!r.ok) {
          setCfgErr((c as { error?: string }).error || 'Gagal memuat konfigurasi server.');
          setCfg({ setup: false, areas: [] });
          return;
        }
        setCfg(c as Cfg);
      })
      .catch(() => {
        setCfgErr('Tidak bisa menghubungi server. Cek koneksi atau buka /api/health.');
        setCfg({ setup: false, areas: [] });
      });
  }, []);

  const setup = !!cfg?.setup;
  const areas = cfg?.areas ?? [];
  const sel = setup ? 'admin' : lrole;

  async function doLogin() {
    if (!pin) {
      setMsg('Isi PIN.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ role: Role; area: string | null }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ role: sel, pin, area }),
      });
      const isDept = /^d/.test(r.area || '');
      router.replace(defaultPath(r.role, isDept));
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', paddingTop: 6 }}>
        <h2>Audit Internal</h2>
      </div>
      <section className="card login">
        <p className="muted" style={{ margin: 0 }}>
          {setup
            ? 'Belum ada PIN. Pilih Admin dan buat PIN admin. Lakukan ini lebih dulu sebelum tautan dibagikan ke tim.'
            : 'Pilih peran, lalu masukkan PIN.'}
        </p>
        {cfgErr && (
          <div className="banner" style={{ marginTop: 0 }}>
            {cfgErr}
          </div>
        )}
        <div className="seg roles" role="radiogroup" aria-label="Peran">
          {(['prod', 'auditor', 'admin'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={sel === r}
              disabled={setup && r !== 'admin'}
              onClick={() => setLrole(r)}
            >
              {SHORT[r]}
            </button>
          ))}
        </div>
        {sel === 'prod' && (
          <label className="f">
            Area atau unit Anda
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <optgroup label="Produksi">
                {areas.map((x, i) => (
                  <option key={x.id} value={x.id}>
                    {i + 1}. {x.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Departemen lain">
                {SEED_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.dept} · {u.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        )}
        <label className="f">
          {setup ? 'Buat PIN admin (min. 4 karakter)' : 'PIN'}
          <input
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doLogin();
            }}
          />
        </label>
        <div className="muted" style={{ minHeight: 18 }}>
          {msg}
        </div>
        <button className="btn" type="button" disabled={busy || !cfg} onClick={doLogin}>
          {setup ? 'Buat PIN dan masuk' : 'Masuk'}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Produksi / Departemen: lihat tren dan isi action plan area atau unit sendiri. Auditor: isi form dan lihat semua. Admin: semua fitur dan pengaturan akses.
        </div>
      </section>
    </>
  );
}
