import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { envPin } from '@/lib/pins';

export async function GET() {
  const out: Record<string, unknown> = {
    app: 'ok',
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      PIN_ADMIN: !!envPin('admin'),
      PIN_PRODUKSI: !!envPin('prod'),
      PIN_AUDITOR: !!envPin('auditor'),
      SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE ?? '(unset)',
    },
  };
  try {
    const rows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`;
    const tables = rows.map((r) => r.table_name);
    const required = ['config', 'audits', 'dept_audits', 'photos'];
    const missing = required.filter((t) => !tables.includes(t));
    out.db = 'ok';
    out.tables = tables;
    out.missingTables = missing;
    out.ready = missing.length === 0;

    if (missing.length === 0) {
      const [c] = await sql<{ audits: number; dept_audits: number; areas: number }[]>`
        select
          (select count(*) from audits)::int as audits,
          (select count(*) from dept_audits)::int as dept_audits,
          coalesce((select jsonb_array_length(value->'list') from config where key = 'areas'), 0) as areas`;
      out.counts = { audits: c.audits, dept_audits: c.dept_audits, areas: c.areas };
    }
  } catch (e) {
    out.db = 'error';
    out.ready = false;
    out.error = (e as Error).message;
  }
  return NextResponse.json(out, { status: out.ready ? 200 : 503 });
}
