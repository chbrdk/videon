/**
 * Deduplicate scene rows by stable id (vision API uses sceneId, video detail uses id).
 */
export function dedupeScenesById<T extends { sceneId?: string; id?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = row.sceneId ?? row.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
