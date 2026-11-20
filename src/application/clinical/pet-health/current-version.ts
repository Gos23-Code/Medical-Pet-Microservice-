// Lectura de una fila con sus correcciones: la fila original nunca cambia (db/scripts/005 y 006).
// El estado actual es la fila original + los valores de cada versión, en orden.

export interface VersionRecord {
  version: number;
  values: Record<string, unknown>;
  authorUserId: string;
  veterinaryId: string | null;
  authorRole: 'OWNER' | 'CLINIC';
  createdAt: string;
}

export function sortVersions(versions: readonly VersionRecord[]): VersionRecord[] {
  return [...versions].sort((a, b) => a.version - b.version);
}

/** Aplica las versiones, de la más antigua a la más nueva, sobre los valores originales. */
export function currentValues<T extends Record<string, unknown>>(base: T, versions: readonly VersionRecord[]): T {
  const merged: Record<string, unknown> = { ...base };
  for (const version of sortVersions(versions)) {
    Object.assign(merged, version.values);
  }
  return merged as T;
}

/** Última versión que cumple la condición, o null. */
export function lastVersionWhere(
  versions: readonly VersionRecord[],
  predicate: (version: VersionRecord) => boolean
): VersionRecord | null {
  const matches = sortVersions(versions).filter(predicate);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
