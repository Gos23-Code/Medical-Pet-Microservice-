import { createClient } from '@/src/infrastructure/database/supabase/client';
import { CorrectableTable } from '@/src/domain/repositories/clinical-correction.repository';
import { attachCorrectedValues, collectIds, correctionsByRecord } from '@/src/application/clinical/corrected-values';

// Añade correctedValues y correctionCount a una respuesta de lectura de actos clínicos.
// Si una lectura no puede leer sus versiones, falla: no se devuelve un dato corregido a medias.
export async function withCorrections<T>(table: CorrectableTable, payload: T): Promise<T> {
  const ids = collectIds(payload);
  if (ids.length === 0) return payload;

  const { data, error } = await createClient()
    .from('clinical_record_versions')
    .select('record_id, version, values')
    .eq('record_table', table)
    .in('record_id', ids);

  if (error) {
    throw new Error(`Error leyendo correcciones de ${table}: ${error.message}`);
  }

  const rows = (data ?? []).map((row) => ({
    recordId: row.record_id as string,
    version: row.version as number,
    values: row.values as Record<string, unknown>,
  }));
  return attachCorrectedValues(payload, correctionsByRecord(rows));
}
