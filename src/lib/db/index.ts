import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/audit_internal';

const globalForDb = globalThis as unknown as { _sql?: ReturnType<typeof postgres> };
const sql = globalForDb._sql ?? postgres(url, { max: 5 });
if (process.env.NODE_ENV !== 'production') globalForDb._sql = sql;

export const db = drizzle(sql, { schema });
export { sql };
