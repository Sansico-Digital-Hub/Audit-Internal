'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { SESSION_TTL_HOURS } from '@/lib/constants';
import { defaultPath } from '@/lib/nav';
import { SEED_UNITS } from '@/lib/seed-data';
import { IconDownload, IconEye, IconEyeOff, IconLock } from './icons';
import type { Role } from '@/lib/types';

interface Cfg {
  setup: boolean;
  areas: { id: string; name: string }[];
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SHORT: Record<Role, string> = { prod: 'Departemen', auditor: 'Auditor', admin: 'Admin' };

export default function Login({ initialExpired = false }: { initialExpired?: boolean }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [cfgErr, setCfgErr] = useState('');
  const [lrole, setLrole] = useState<Role>('prod');
  const [pin, setPin] = useState('');
  const [area, setArea] = useState('a1');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [expired, setExpired] = useState(initialExpired);
  const [installEvt, setInstallEvt] = useState<InstallPrompt | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);

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

  // Reset saat halaman dipulihkan dari cache browser (back/forward) agar tombol tak "macet".
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setBusy(false);
        setPin('');
        setMsg('');
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Pemberitahuan sesi berakhir (dari auto logout 12 jam atau server).
  useEffect(() => {
    let wasExpired = false;
    try {
      if (sessionStorage.getItem('audit:expired')) {
        wasExpired = true;
        sessionStorage.removeItem('audit:expired');
      }
      const exp = Number(localStorage.getItem('audit:exp'));
      if (exp && exp <= Date.now()) {
        wasExpired = true;
        localStorage.removeItem('audit:exp');
      }
    } catch {
      /* ignore */
    }
    const raf = wasExpired ? requestAnimationFrame(() => setExpired(true)) : 0;
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // PWA: tombol unduh memakai dialog install bawaan browser.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
      setInstallHelp(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const raf = window.matchMedia('(display-mode: standalone)').matches ? requestAnimationFrame(() => setInstalled(true)) : 0;
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  async function installApp() {
    if (installed) return;
    if (!installEvt) {
      setInstallHelp(true);
      return;
    }
    setInstallBusy(true);
    try {
      await installEvt.prompt();
      const choice = await installEvt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallEvt(null);
    } catch {
      setInstallHelp(true);
    }
    setInstallBusy(false);
  }

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
      try {
        localStorage.setItem('audit:exp', String(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000));
      } catch {
        /* ignore */
      }
      setExpired(false);
      setBusy(false);
      router.replace(defaultPath(r.role, isDept));
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
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
          <span className="pin-field">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={pin}
              placeholder="Masukkan PIN"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doLogin();
              }}
            />
            <button
              type="button"
              className="pin-toggle"
              aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
              onClick={() => setShowPin((s) => !s)}
            >
              {showPin ? <IconEyeOff /> : <IconEye />}
            </button>
          </span>
        </label>
        <div className="muted" style={{ minHeight: 18 }}>
          {msg}
        </div>
        <button className="btn" type="button" disabled={busy} onClick={doLogin}>
          {setup ? 'Buat PIN dan masuk' : 'Masuk'}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Produksi / Departemen: lihat tren dan isi action plan area atau unit sendiri. Auditor: isi form dan lihat semua. Admin: semua fitur dan pengaturan akses.
        </div>
      </section>

      <section className="card login app-dl">
        <div className="app-dl-head">
          <span className="app-dl-ic">
            <IconDownload size={22} />
          </span>
          <div>
            <h3>Unduh aplikasi</h3>
            <p className="muted">Pasang Audit Internal di HP atau komputer agar bisa dibuka langsung seperti aplikasi.</p>
          </div>
        </div>
        <button className="btn ghost" type="button" disabled={installed || installBusy} onClick={installApp}>
          {installed ? 'Aplikasi sudah terpasang' : installBusy ? 'Membuka…' : 'Unduh aplikasi'}
        </button>
        {installHelp && !installed && (
          <p className="muted app-dl-help">
            Jika dialog unduh tidak muncul, buka menu browser lalu pilih <b>Install app</b> / <b>Tambahkan ke layar utama</b>.
            Di iPhone gunakan Safari: <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>.
          </p>
        )}
      </section>

      {expired && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="expired-title">
          <div className="modal-card">
            <span className="modal-ic">
              <IconLock size={22} />
            </span>
            <h3 id="expired-title">Sesi sudah berakhir</h3>
            <p className="muted">Sesi hanya aktif 12 jam. Silakan login ulang untuk melanjutkan.</p>
            <button className="btn" type="button" onClick={() => setExpired(false)}>
              Login ulang
            </button>
          </div>
        </div>
      )}
    </>
  );
}
