'use client';

import type { CSSProperties } from 'react';

export function Skeleton({
  height = 16,
  width,
  radius,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return <div className="skeleton" style={{ height, width: width ?? '100%', borderRadius: radius, ...style }} />;
}

export function PageSkeleton() {
  return (
    <>
      <Skeleton height={30} width={260} />
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="card kpi" key={i}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={34} width={96} style={{ marginTop: 10 }} />
            <Skeleton height={12} width="45%" style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="card pnl">
        <Skeleton height={18} width={220} />
        <Skeleton height={230} style={{ marginTop: 14 }} />
      </div>
      <div className="card pnl">
        <Skeleton height={18} width={180} />
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={38} />
          ))}
        </div>
      </div>
    </>
  );
}
