import type { Role } from './types';

export const ENV_PIN: Record<Role, string | undefined> = {
  admin: process.env.PIN_ADMIN,
  prod: process.env.PIN_PRODUKSI || process.env.PIN_PROD,
  auditor: process.env.PIN_AUDITOR,
};

export const envPin = (role: Role): string | undefined => ENV_PIN[role];
export const envManaged = (role: Role): boolean => Boolean(ENV_PIN[role]);
