'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AppCtx, type Session } from './ctx';
import { buildCatalog } from '@/lib/catalog';
import { api, now } from '@/lib/client';
import { openCounts } from '@/lib/derive';
import type { Audit, CustomItem, DeptAudit } from '@/lib/types';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const markExpired = () => {
  try {
    sessionStorage.setItem('audit:expired', '1');
  } catch {
    /* ignore */
  }
};

// Auto-refresh senyap: perbarui data tanpa efek samping (tanpa skeleton, tanpa
// fetch saat pindah tab / jaringan pulih, pertahankan data lama saat revalidasi).
const SWR_OPTS = {
  refreshInterval: 30000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshWhenHidden: false,
  keepPreviousData: true,
};

interface ConfigResp {
  session: Session | null;
  setup: boolean;
  access: { prod: boolean; auditor: boolean; admin: boolean };
  envManaged: { prod: boolean; auditor: boolean; admin: boolean };
  scopePins: Record<string, boolean>;
  itemOverrides?: import('@/lib/catalog').ItemOverrides;
  areas: { id: string; name: string }[];
  custom: CustomItem[];
}

export default function AppProvider({ initialSession, children }: { initialSession: Session; children: React.ReactNode }) {
  const router = useRouter();
  const loggingOut = useRef(false);
  const { data: cfg, mutate: mutateCfg } = useSWR<ConfigResp>('/api/config', fetcher, SWR_OPTS);
  const session = cfg ? cfg.session : initialSession;
  const loggedIn = !!session;

  const { data: audits, mutate: mutateAudits, isLoading: auditsLoading } = useSWR<Audit[]>(
    loggedIn ? '/api/audits' : null,
    fetcher,
    SWR_OPTS,
  );
  const { data: daudits, mutate: mutateD, isLoading: dauditsLoading } = useSWR<DeptAudit[]>(
    loggedIn ? '/api/daudits' : null,
    fetcher,
    SWR_OPTS,
  );
  const auditsArr = audits ?? [];
  const dauditsArr = daudits ?? [];

  const [toastMsg, setToastMsg] = useState<{ m: string; k: number } | null>(null);
  const [photo, setPhoto] = useState<{ list: string[]; i: number } | null>(null);
  const openPhoto = (list: string[], index = 0) => setPhoto({ list, i: index });

  useEffect(() => {
    if (!photo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPhoto((p) => (p ? { ...p, i: (p.i - 1 + p.list.length) % p.list.length } : p));
      if (e.key === 'ArrowRight') setPhoto((p) => (p ? { ...p, i: (p.i + 1) % p.list.length } : p));
      if (e.key === 'Escape') setPhoto(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [photo]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (cfg && !cfg.session) {
      if (!loggingOut.current) markExpired();
      router.replace('/login');
      router.refresh();
    }
  }, [cfg, router]);

  // Auto logout tepat saat token 12 jam berakhir (tab tersembunyi pun dicek saat kembali aktif).
  useEffect(() => {
    const exp = session?.exp;
    if (!exp) return;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      markExpired();
      router.replace('/login');
      router.refresh();
    };
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) {
      end();
      return;
    }
    const timer = setTimeout(end, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() >= exp * 1000) end();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session?.exp, router]);

  const catalog = useMemo(() => buildCatalog(cfg?.custom || [], cfg?.itemOverrides || {}), [cfg?.custom, cfg?.itemOverrides]);
  const areas = cfg?.areas ?? [];
  const scoped = session?.role === 'prod';
  const openCount = openCounts(
    scoped ? auditsArr.filter((a) => a.areaId === session?.area) : auditsArr,
    scoped ? dauditsArr.filter((a) => a.unit === session?.area) : dauditsArr,
  );
  const loading = !cfg || (loggedIn && (auditsLoading || dauditsLoading));

  const toast = (m: string) => setToastMsg({ m, k: now() });
  const refresh = () => {
    mutateCfg();
    mutateAudits();
    mutateD();
  };
  async function logout() {
    loggingOut.current = true;
    try {
      sessionStorage.removeItem('audit:expired');
      localStorage.removeItem('audit:exp');
    } catch {
      /* ignore */
    }
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <AppCtx.Provider
      value={{
        catalog,
        session,
        areas,
        access: cfg?.access ?? { prod: false, auditor: false, admin: false },
        envManaged: cfg?.envManaged ?? { prod: false, auditor: false, admin: false },
        scopePins: cfg?.scopePins ?? {},
        setup: !!cfg?.setup,
        audits: auditsArr,
        daudits: dauditsArr,
        loading,
        openCount,
        toast,
        openPhoto,
        refresh,
        logout,
      }}
    >
      {children}
      {toastMsg && (
        <div className="toast" key={toastMsg.k}>
          {toastMsg.m}
        </div>
      )}
      {photo && (
        <div className="lb" onClick={() => setPhoto(null)}>
          <img src={photo.list[photo.i]} alt="Foto bukti" onClick={(e) => e.stopPropagation()} />
          {photo.list.length > 1 && (
            <>
              <button
                className="lb-nav prev"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhoto((p) => (p ? { ...p, i: (p.i - 1 + p.list.length) % p.list.length } : p));
                }}
              >
                ‹
              </button>
              <button
                className="lb-nav next"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhoto((p) => (p ? { ...p, i: (p.i + 1) % p.list.length } : p));
                }}
              >
                ›
              </button>
              <span className="lb-count">
                {photo.i + 1} / {photo.list.length}
              </span>
            </>
          )}
        </div>
      )}
    </AppCtx.Provider>
  );
}
