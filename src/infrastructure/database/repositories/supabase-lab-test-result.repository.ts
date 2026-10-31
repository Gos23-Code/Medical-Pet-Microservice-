import { createClient } from '@/src/infrastructure/database/supabase/client';
import { toResponse } from '@/src/application/clinical/field-spec';
import { LAB_RESULT_FIELDS } from '@/src/application/clinical/clinical-specs';
import { parseLabResults } from '@/src/application/clinical/lab-results';

// Parámetros de un examen (tabla lab_test_results, db/scripts/004). Tabla del mockup:
// "Parámetro · Resultado · Rango normal · Estado".

/** Reemplaza los parámetros de un examen (borra los anteriores y guarda los nuevos). */
export async function replaceLabResults(labTestId: string, rows: Record<string, unknown>[]): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase.from('lab_test_results').delete().eq('lab_test_id', labTestId);
  if (deleteError) throw new Error(`Error reemplazando parámetros: ${deleteError.message}`);

  if (rows.length === 0) return;
  const { error } = await supabase
    .from('lab_test_results')
    .insert(rows.map((row) => ({ ...row, lab_test_id: labTestId })));
  if (error) throw new Error(`Error guardando parámetros: ${error.message}`);
}

/** Parámetros de varios exámenes, en formato de respuesta, ordenados como se cargaron. */
export async function loadLabResults(labTestIds: string[]): Promise<Map<string, Record<string, unknown>[]>> {
  const grouped = new Map<string, Record<string, unknown>[]>();
  if (labTestIds.length === 0) return grouped;

  const { data, error } = await createClient()
    .from('lab_test_results')
    .select('*')
    .in('lab_test_id', labTestIds)
    .order('position', { ascending: true });
  if (error) throw new Error(`Error leyendo parámetros: ${error.message}`);

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const key = String(row.lab_test_id);
    const list = grouped.get(key) ?? [];
    list.push(toResponse(row, LAB_RESULT_FIELDS));
    grouped.set(key, list);
  }
  return grouped;
}
