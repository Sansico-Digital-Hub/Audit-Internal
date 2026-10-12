'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './ctx';
import { IconChevron, IconClose, IconLogo, IconLogout, IconPanel, NAV_ICONS } from './icons';
import { ROLE_LABEL } from '@/lib/constants';
import { linksFor } from '@/lib/nav';
import { unitById } from '@/lib/scoring';

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const { session, areas, openCount, logout } = useApp();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const role = session?.role;
  const isDept = /^d/.test(session?.area || '');
  const links = linksFor(role, isDept);
  const scopeName =
    role === 'prod'
      ? isDept
        ? unitById(session?.area || '')?.name || ''
        : areas.find((a) => a.id === session?.area)?.name || ''
      : '';

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' open' : ''}`}>
      <div className="sidebar-head">
        <Link className="sidebar-brand" href={isDept && role === 'prod' ? '/departemen' : '/dashboard'} onClick={onNavigate}>
          <IconLogo size={26} />
          <span className="sb-label sb-title">Audit Internal</span>
        </Link>
        <button className="icon-btn sb-toggle" onClick={onToggle} aria-label={collapsed ? 'Perluas menu' : 'Ringkas menu'}>
          <IconPanel />
        </button>
        <button className="icon-btn sb-close" onClick={onNavigate} aria-label="Tutup menu">
          <IconClose />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((l) => {
          const Icon = NAV_ICONS[l.href] || IconPanel;

          if (l.children) {
            const childActive = l.children.some((c) => pathname === c.href);
            const isOpen = openGroups[l.href] ?? childActive;
            return (
              <div key={l.href} className="nav-group">
                <button
                  type="button"
                  className={`nav-item${childActive ? ' active' : ''}`}
                  aria-expanded={isOpen}
                  title={l.label}
                  onClick={() => setOpenGroups((o) => ({ ...o, [l.href]: !isOpen }))}
                >
                  <Icon />
                  <span className="sb-label">{l.label}</span>
                  <IconChevron className={`nav-chevron${isOpen ? ' open' : ''}`} />
                </button>
                {isOpen && (
                  <div className="nav-children">
                    {l.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`nav-item nav-child${pathname === c.href ? ' active' : ''}`}
                        onClick={onNavigate}
                      >
                        <span className="sb-label">{c.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} className={`nav-item${active ? ' active' : ''}`} onClick={onNavigate} title={l.label}>
              <Icon />
              <span className="sb-label">{l.label}</span>
              {l.href === '/temuan' && openCount > 0 && <span className="pill bad sb-badge">{openCount}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        {role && (
          <div className="sb-label who-pill">
            <span className="pill good">
              {ROLE_LABEL[role]}
              {scopeName ? ' · ' + scopeName : ''}
            </span>
          </div>
        )}
        <button className="nav-item" onClick={logout} title="Keluar">
          <IconLogout />
          <span className="sb-label">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
