export type Answer = 'M' | 'DM' | 'NA';

export interface Item {
  n: number;
  t: string;
  r: string;
  custom?: boolean;
  off?: boolean;
}

export interface Category {
  name: string;
  w: number;
  from: number;
  to: number;
  group?: string;
  extra?: number[];
}

export interface Unit {
  id: string;
  short: string;
  name: string;
  dept: string;
  cats: Category[];
  items: Item[];
}

export interface Section {
  k: string;
  name: string;
  pol: string;
  w: number;
  from: number;
  to: number;
  extra?: number[];
}

export interface Finding {
  finding: string;
  plan?: string;
  pic?: string;
  due?: string;
  status?: string;
  photos?: string[];
  donePhotos?: string[];
  closedAt?: string;
}

export interface ScoreSection {
  k: string;
  name: string;
  m: number;
  d: number;
  na: number;
  pct: number | null;
  pts: number | null;
  w: number;
}

export interface Calc {
  secs: ScoreSection[];
  total: number | null;
  answered: number;
  dm: number;
  imp?: boolean;
}

export interface Audit {
  id: string;
  date: string;
  areaId: string;
  areaName?: string;
  auditor: string;
  auditee: string;
  ans: Record<string, Answer>;
  finds: Record<string, Finding>;
  score?: Partial<Record<string, number>>;
  createdAt: number;
  c?: Calc;
  imported?: boolean;
}

export interface DeptAudit {
  id: string;
  unit: string;
  unitName?: string;
  dept?: string;
  date: string;
  auditor: string;
  auditee: string;
  ans: Record<string, Answer>;
  finds: Record<string, Finding>;
  score?: Partial<Record<string, number>>;
  createdAt: number;
  c?: Calc;
}

export interface CustomItem {
  n: number;
  scope: string;
  sec: string;
  t: string;
  r: string;
  active: boolean;
  createdAt: number;
}

export type Role = 'prod' | 'auditor' | 'admin';
