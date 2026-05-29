import { createClient } from '@/lib/supabase/client';
import { LabTest } from '@/src/domain/entities/lasbTest.entity';
import { LabTestRepository } from '../../domain/repositories/labTest.repository';
import { LabTestResponseDto } from '../../application/dtos/labTest.dto';

// Interfaz para los datos en Supabase
interface SupabaseLabTest {
  id: string;
  visit_id: string;
  name: string;
  result: string | null;
  normal_range: string | null;
  date: string | null;
  notes: string | null;
  created_at: string;
}

export class SupabaseLabTestRepository implements LabTestRepository {
    //Add
  async save(labTest: LabTest): Promise<LabTestResponseDto> {
    const { data, error } = await createClient()
      .from('lab_tests')
      .insert({
        visit_id: labTest.visit_id,
        name: labTest.name,
        result: labTest.result ?? null,
        normal_range: labTest.normal_range ?? null,
        date: labTest.date
          ? labTest.date.toISOString().split('T')[0]
          : null,
        notes: labTest.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error guardando lab test: ${error.message}`);
    }

    const record = data as SupabaseLabTest;
    return {
      message: 'LabTest creado',
      id: record.id,
      visit_id: record.visit_id,
      name: record.name,
      result: record.result ?? undefined,
      normal_range: record.normal_range ?? undefined,
      date: record.date ?? undefined,
      notes: record.notes ?? undefined,
      created_at: new Date(record.created_at).toISOString(),
    };
  }
}