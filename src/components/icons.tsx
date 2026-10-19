import type { ReactElement, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconLogo = ({ size }: P) => (
  <svg {...base(size ?? 26)} aria-hidden="true">
    <circle cx="12" cy="12" r="6.5" stroke="var(--blue-600)" strokeWidth="2" />
    <path d="M12 2v20M2 12h20" />
    <circle cx="12" cy="12" r="2.2" fill="var(--bad)" stroke="none" />
  </svg>
);

export const IconPanel = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);

export const IconMenu = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const IconClose = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconDashboard = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconBoxes = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </svg>
);

export const IconAlert = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M10.3 4.3 2.8 17.5A1.6 1.6 0 0 0 4.2 20h15.6a1.6 1.6 0 0 0 1.4-2.5L13.7 4.3a1.6 1.6 0 0 0-2.8 0z" />
    <path d="M12 9.5v4M12 17h.01" />
  </svg>
);

export const IconClipboard = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4.5V3.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3.5v1" />
    <path d="M9 10h6M9 14h6M9 18h3" />
  </svg>
);

export const IconHistory = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V9H8" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const IconPin = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const IconListChecks = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 7l2 2 3-3M4 17l2 2 3-3" />
    <path d="M13 8h7M13 18h7" />
  </svg>
);

export const IconLock = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconLogout = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M5 12h12" />
  </svg>
);

export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size ?? 16)} className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconFactory = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 20V9l6 4V9l6 4V9l6 4v7z" />
    <path d="M3 20h18" />
    <path d="M7 20v-3M12 20v-3M17 20v-3" />
  </svg>
);

export const IconBuilding = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6" />
  </svg>
);

export const IconEye = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
    <path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.2 4.1" />
    <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 3.9-.8" />
  </svg>
);

export const IconEdit = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconDownload = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const NAV_ICONS: Record<string, (p: P) => ReactElement> = {
  '/dashboard': IconDashboard,
  '/departemen': IconBoxes,
  '/temuan': IconAlert,
  '/input': IconClipboard,
  '/riwayat': IconHistory,
  '/area': IconPin,
  '/checklist': IconListChecks,
  '/akses': IconLock,
};
