// Lectura de actos con sus correcciones (db/scripts/005 y 006).
// La fila original nunca cambia. Cada respuesta de lectura recibe dos campos extra:
//   • correctedValues: los campos corregidos, con el valor de la última versión (solo las claves corregidas).
//   • correctionCount: cuántas correcciones tiene el acto (0 si nunca se corrigió).
// El cliente usa correctedValues por encima de la fila original cuando la clave existe.

export interface VersionValueRow {
  recordId: string;
  version: number;
  values: Record<string, unknown>;
}

export interface CorrectedState {
  correctedValues: Record<string, unknown>;
  correctionCount: number;
}

/** Agrupa las versiones por acto: valores fusionados en orden de versión y número de correcciones. */
export function correctionsByRecord(rows: VersionValueRow[]): Map<string, CorrectedState> {
  const sorted = [...rows].sort((a, b) => a.version - b.version);
  const result = new Map<string, CorrectedState>();
  for (const row of sorted) {
    const current = result.get(row.recordId) ?? { correctedValues: {}, correctionCount: 0 };
    current.correctedValues = { ...current.correctedValues, ...row.values };
    current.correctionCount += 1;
    result.set(row.recordId, current);
  }
  return result;
}

/** Ids de los actos de una respuesta: un objeto, una lista, o { data: objeto | lista }. */
export function collectIds(payload: unknown): string[] {
  const ids: string[] = [];
  const visit = (item: unknown) => {
    if (item && typeof item === 'object' && 'id' in item && (item as { id: unknown }).id != null) {
      ids.push(String((item as { id: unknown }).id));
    }
  };
  for (const item of itemsOf(payload)) visit(item);
  return ids;
}

/** Adjunta correctedValues y correctionCount a cada acto de la respuesta. Lo que no tiene id no se toca. */
export function attachCorrectedValues<T>(payload: T, corrections: Map<string, CorrectedState>): T {
  const apply = (item: unknown): unknown => {
    if (!item || typeof item !== 'object' || !('id' in item) || (item as { id: unknown }).id == null) return item;
    const state = corrections.get(String((item as { id: unknown }).id));
    return { ...item, correctedValues: state?.correctedValues ?? {}, correctionCount: state?.correctionCount ?? 0 };
  };

  if (Array.isArray(payload)) return payload.map(apply) as T;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    return { ...payload, data: Array.isArray(data) ? data.map(apply) : apply(data) } as T;
  }
  return apply(payload) as T;
}

function itemsOf(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    return Array.isArray(data) ? data : [data];
  }
  return [payload];
}
