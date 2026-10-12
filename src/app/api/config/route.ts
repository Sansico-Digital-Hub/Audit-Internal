import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getAccess, getConfig } from '@/lib/config-store';
import { envPin } from '@/lib/pins';
import { DEFAULT_AREA_NAMES } from '@/lib/seed-data';
import type { AreasConfig, CustomConfig } from '@/lib/config-store';

export async function GET() {
  const s = await readSession();
  const access = (await getAccess()) || {};
  const areasCfg = await getConfig<AreasConfig>('areas');
  const customCfg = await getConfig<CustomConfig>('customitems');

  const byId: Record<string, string> = {};
  (areasCfg?.list || []).forEach((a) => (byId[a.id] = a.name));
  const areas = DEFAULT_AREA_NAMES.map((name, i) => ({ id: 'a' + (i + 1), name: byId['a' + (i + 1)] || name }));

  return NextResponse.json({
    session: s ? { role: s.role, area: s.area } : null,
    setup: !access.admin && !envPin('admin'),
    access: {
      prod: !!access.prod || !!envPin('prod'),
      auditor: !!access.auditor || !!envPin('auditor'),
      admin: !!access.admin || !!envPin('admin'),
    },
    envManaged: {
      prod: !!envPin('prod'),
      auditor: !!envPin('auditor'),
      admin: !!envPin('admin'),
    },
    areas,
    custom: customCfg?.list || [],
  });
}
