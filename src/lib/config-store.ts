import { eq } from 'drizzle-orm';
import { db } from './db';
import { config } from './db/schema';
import type { CustomItem } from './types';

export interface AccessConfig {
  prod?: string;
  auditor?: string;
  admin?: string;
}
export interface AreasConfig {
  list: { id: string; name: string }[];
}
export interface CustomConfig {
  list: CustomItem[];
}

export async function getConfig<T = unknown>(key: string): Promise<T | null> {
  const rows = await db.select().from(config).where(eq(config.key, key)).limit(1);
  return rows.length ? (rows[0].value as T) : null;
}

export async function setConfig(key: string, value: unknown) {
  await db
    .insert(config)
    .values({ key, value: value as object })
    .onConflictDoUpdate({ target: config.key, set: { value: value as object, updatedAt: new Date() } });
}

export const getAccess = () => getConfig<AccessConfig>('access');
export const getScopePins = () => getConfig<Record<string, string>>('scopepins');
