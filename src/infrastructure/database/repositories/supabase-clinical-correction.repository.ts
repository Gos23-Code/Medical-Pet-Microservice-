import { createClient } from '@/src/infrastructure/database/supabase/client';
import { ActRef } from '@/src/application/clinical/act-integrity';
import {
  ApplyCorrectionInput,
  ClinicalCorrectionRepository,
  ClinicalVersion,
  CorrectableTable,
} from '@/src/domain/repositories/clinical-correction.repository';

// Correcciones de actos (db/scripts/005_integridad_actos.sql).
// La escritura de la versión y la auditoría ocurre en la función SQL apply_clinical_correction,
// así que es una sola transacción. No hay método de UPDATE sobre la fila original.

/** Nombres de columna de autoría por tabla. WeightRecord usa PascalCase. */
const ACT_COLUMNS: Record<CorrectableTable, { source: string; veterinary: string; author: string }> = {
  vaccines: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  veterinary_visits: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  treatments: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  medications: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  lab_tests: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  pet_surgeries: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  WeightRecord: { source: 'Source', veterinary: 'VeterinaryId', author: 'RegisteredByUserId' },
  pet_allergies: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
  pet_dewormings: { source: 'source', veterinary: 'veterinary_id', author: 'created_by_user_id' },
};

export class SupabaseClinicalCorrectionRepository implements ClinicalCorrectionRepository {
  constructor(private readonly supabase = createClient()) {}

  async getActRef(table: CorrectableTable, recordId: string): Promise<ActRef | null> {
    const columns = ACT_COLUMNS[table];
    const { data, error } = await this.supabase
      .from(table)
      .select(`${columns.source}, ${columns.veterinary}, ${columns.author}`)
      .eq('id', recordId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error leyendo el acto ${table}/${recordId}: ${error.message}`);
    }
    if (!data) {
      return null;
    }

    const row = data as unknown as Record<string, string | null>;
    return {
      source: row[columns.source] as ActRef['source'],
      veterinaryId: row[columns.veterinary] ?? null,
      createdByUserId: row[columns.author] ?? null,
    };
  }

  async applyCorrection(input: ApplyCorrectionInput): Promise<number> {
    const { data, error } = await this.supabase.rpc('apply_clinical_correction', {
      p_table: input.table,
      p_record_id: input.recordId,
      p_reason: input.reason,
      p_values: input.values,
      p_author_user_id: input.authorUserId,
      p_author_employee_id: input.authorEmployeeId,
      p_veterinary_id: input.veterinaryId,
      p_author_role: input.authorRole,
    });

    if (error) {
      throw new Error(`Error aplicando la corrección: ${error.message}`);
    }
    return data as number;
  }

  async listVersions(table: CorrectableTable, recordId: string): Promise<ClinicalVersion[]> {
    const { data, error } = await this.supabase
      .from('clinical_record_versions')
      .select('version, kind, values, reason, author_user_id, author_employee_id, veterinary_id, author_role, created_at')
      .eq('record_table', table)
      .eq('record_id', recordId)
      .order('version', { ascending: true });

    if (error) {
      throw new Error(`Error leyendo versiones de ${table}/${recordId}: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      version: row.version,
      kind: row.kind,
      values: row.values,
      reason: row.reason,
      authorUserId: row.author_user_id,
      authorEmployeeId: row.author_employee_id ?? null,
      veterinaryId: row.veterinary_id ?? null,
      authorRole: row.author_role,
      createdAt: row.created_at,
    }));
  }
}
