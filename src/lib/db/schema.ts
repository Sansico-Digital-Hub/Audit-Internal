import { pgTable, text, integer, jsonb, timestamp, bigint, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const config = pgTable('config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const audits = pgTable('audits', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  areaId: text('area_id').notNull(),
  areaName: text('area_name'),
  auditor: text('auditor').notNull(),
  auditee: text('auditee').notNull(),
  ans: jsonb('ans').$type<Record<string, string>>().notNull(),
  finds: jsonb('finds').$type<Record<string, unknown>>().notNull().default({}),
  score: jsonb('score').$type<Record<string, number>>(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const deptAudits = pgTable('dept_audits', {
  id: text('id').primaryKey(),
  unit: text('unit').notNull(),
  unitName: text('unit_name'),
  dept: text('dept'),
  date: text('date').notNull(),
  auditor: text('auditor').notNull(),
  auditee: text('auditee').notNull(),
  ans: jsonb('ans').$type<Record<string, string>>().notNull(),
  finds: jsonb('finds').$type<Record<string, unknown>>().notNull().default({}),
  score: jsonb('score').$type<Record<string, number>>(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const photos = pgTable('photos', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull(),
  auditSrc: text('audit_src').notNull().default('p'),
  itemN: integer('item_n').notNull(),
  kind: text('kind').notNull().default('photos'),
  mime: text('mime').notNull().default('image/jpeg'),
  data: bytea('data').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
