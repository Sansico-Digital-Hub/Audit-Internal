// Root cause per nomor temuan; dipakai untuk kolom root_cause yang bisa difilter.
export function rootCauseMap(finds: unknown): Record<string, string> {
  if (!finds || typeof finds !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [n, f] of Object.entries(finds as Record<string, unknown>)) {
    const rootCause = f && typeof f === 'object' ? (f as { rootCause?: unknown }).rootCause : undefined;
    if (typeof rootCause === 'string' && rootCause.trim()) out[n] = rootCause.trim();
  }
  return out;
}
