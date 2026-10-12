'use client';

import { useState, useSyncExternalStore } from 'react';
import AppProvider from './AppProvider';
import Sidebar from './Sidebar';
import { IconLogo, IconMenu } from './icons';
import type { Session } from './ctx';

const KEY = 'audit-sb-collapsed';
const EV = 'sb-collapse-change';

function subscribe(cb: () => void) {
  window.addEventListener(EV, cb);
  return () => window.removeEventListener(EV, cb);
}
const getSnapshot = () => localStorage.getItem(KEY) === '1';
const getServerSnapshot = () => false;

export default function Shell({ initialSession, children }: { initialSession: Session; children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle() {
    localStorage.setItem(KEY, collapsed ? '0' : '1');
    window.dispatchEvent(new Event(EV));
  }

  return (
    <AppProvider initialSession={initialSession}>
      <div className={`app${collapsed ? ' sb-collapsed' : ''}`}>
        <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        <div className="app-main">
          <div className="app-topbar">
            <button className="icon-btn" aria-label="Buka menu" onClick={() => setMobileOpen(true)}>
              <IconMenu />
            </button>
            <span className="app-topbar-brand">
              <IconLogo size={22} /> Audit Internal
            </span>
          </div>
          <main className="app-content">{children}</main>
        </div>
        {mobileOpen && <button type="button" className="scrim" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
      </div>
    </AppProvider>
  );
}
