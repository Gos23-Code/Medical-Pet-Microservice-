import { createClient } from '@/lib/supabase/client';
import { weightRecord } from '../../domain/entities/weightRecord.entity';
import { weightRecordRepository } from '../../domain/repositories/weightRecord.repository';

export class SupabaseWeightRecordRepository implements weightRecordRepository {
  async save(record: weightRecord): Promise<weightRecord> {
  const { data, error } = await createClient()
    .from('WeightRecord')
    .insert({
      Weight: record.weight ?? null,
      Date: record.date
        ? record.date.toISOString().split('T')[0]
        : null,
      Note: record.note ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error guardando: ${error.message}`);
  }

  return weightRecord.reconstitute({
    id: data.id,
    petId: data.PetId,
    weight: data.Weight ?? undefined,
    date: data.Date ? new Date(data.Date) : undefined,
    note: data.Note ?? undefined,
    createdAt: new Date(data.created_at),
  });
}
}