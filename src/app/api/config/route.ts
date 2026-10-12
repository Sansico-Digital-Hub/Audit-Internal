import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';
import { getAccess, getConfig } from '@/lib/config-store';
import { envPin } from '@/lib/pins';
import { DEFAULT_AREA_NAMES } from '@/lib/seed-data';
import type { AreasConfig, CustomConfig } from '@/lib/config-store';

const DB_HINT = 'Database tidak siap / tidak terjangkau. Pastikan migrasi sudah dijalankan (npm run db:migrate) dan DATABASE_URL benar. Cek /api/health.';

export async function GET() {
  try {
    const s = await readSession();
    const access = (await getAccess()) || {};
    const areasCfg = await getConfig<AreasConfig>('areas');
    const customCfg = await getConfig<CustomConfig>('customitems');

    const stored = (areasCfg?.list || []).filter((a) => a && a.id && typeof a.name === 'string');
    const areas = stored.length
      ? stored.map((a) => ({ id: String(a.id), name: String(a.name) }))
      : DEFAULT_AREA_NAMES.map((name, i) => ({ id: 'a' + (i + 1), name }));

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
  } catch (e) {
    return NextResponse.json({ error: DB_HINT, detail: (e as Error).message }, { status: 503 });
  }
}
