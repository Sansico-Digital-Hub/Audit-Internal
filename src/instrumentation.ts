export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.SKIP_MIGRATE === '1') return;

  const folder = process.env.MIGRATIONS_FOLDER || './drizzle';
  try {
    const { db } = await import('@/lib/db');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(db, { migrationsFolder: folder });
    console.log('[startup] migrasi diterapkan');
  } catch (e) {
    console.error('[startup] migrasi gagal (app tetap jalan):', (e as Error).message);
  }
}
