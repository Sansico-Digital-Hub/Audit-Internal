import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Muat .env / .env.local agar DATABASE_URL dari environment ikut terpakai.
for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* abaikan bila gagal */
    }
  }
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/audit_internal',
  },
});
