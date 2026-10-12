'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AppCtx, type Session } from './ctx';
import { buildCatalog } from '@/lib/catalog';
import { api, now } from '@/lib/client';
import { openCounts } from '@/lib/derive';
import type { Audit, CustomItem, DeptAudit } from '@/lib/types';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface ConfigResp {
  session: Session | null;
  setup: boolean;
  access: { prod: boolean; auditor: boolean; admin: boolean };
  envManaged: { prod: boolean; auditor: boolean; admin: boolean };
  areas: { id: string; name: string }[];
  custom: CustomItem[];
}

export default function AppProvider({ initialSession, children }: { initialSession: Session; children: React.ReactNode }) {
  const router = useRouter();
  const { data: cfg, mutate: mutateCfg } = useSWR<ConfigResp>('/api/config', fetcher, { refreshInterval: 30000 });
  const session = cfg ? cfg.session : initialSession;
  const loggedIn = !!session;

  const { data: audits, mutate: mutateAudits, isLoading: auditsLoading } = useSWR<Audit[]>(
    loggedIn ? '/api/audits' : null,
    fetcher,
    { refreshInterval: 30000 },
  );
  const { data: daudits, mutate: mutateD, isLoading: dauditsLoading } = useSWR<DeptAudit[]>(
    loggedIn ? '/api/daudits' : null,
    fetcher,
    { refreshInterval: 30000 },
  );
  const auditsArr = audits ?? [];
  const dauditsArr = daudits ?? [];

  const [toastMsg, setToastMsg] = useState<{ m: string; k: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

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
      router.replace('/login');
      router.refresh();
    }
  }, [cfg, router]);

  const catalog = useMemo(() => buildCatalog(cfg?.custom || []), [cfg?.custom]);
  const areas = cfg?.areas ?? [];
  const openCount = openCounts(auditsArr, dauditsArr);
  const loading = !cfg || (loggedIn && (auditsLoading || dauditsLoading));

  const toast = (m: string) => setToastMsg({ m, k: now() });
  const refresh = () => {
    mutateCfg();
    mutateAudits();
    mutateD();
  };
  async function logout() {
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
        setup: !!cfg?.setup,
        audits: auditsArr,
        daudits: dauditsArr,
        loading,
        openCount,
        toast,
        openPhoto: setPhoto,
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
          <img src={photo} alt="Foto bukti" />
        </div>
      )}
    </AppCtx.Provider>
  );
}
