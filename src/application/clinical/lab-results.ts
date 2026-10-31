// Parámetros de un examen de laboratorio (tabla del mockup: Parámetro · Resultado · Rango normal · Estado).
// Sin Supabase: la validación se prueba sola.

import { parseFields } from './field-spec';
import { LAB_RESULT_FIELDS } from './clinical-specs';

export type LabResultParseResult =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; message: string };

/** Valida la lista de parámetros del body. Cada fila necesita parámetro y resultado. */
export function parseLabResults(input: unknown): LabResultParseResult {
  if (input === undefined) return { ok: true, rows: [] };
  if (!Array.isArray(input)) return { ok: false, message: 'results debe ser una lista' };
  if (input.length > 100) return { ok: false, message: 'results no puede tener más de 100 parámetros' };

  const rows: Record<string, unknown>[] = [];
  for (const [index, item] of input.entries()) {
    if (!item || typeof item !== 'object') {
      return { ok: false, message: `results[${index}] debe ser un objeto` };
    }
    const parsed = parseFields(item as Record<string, unknown>, LAB_RESULT_FIELDS);
    if (!parsed.ok) return { ok: false, message: `results[${index}]: ${parsed.message}` };
    if (!parsed.values.parameter_name || !parsed.values.result) {
      return { ok: false, message: `results[${index}] necesita parameter y result` };
    }
    rows.push({ ...parsed.values, position: index });
  }
  return { ok: true, rows };
}
