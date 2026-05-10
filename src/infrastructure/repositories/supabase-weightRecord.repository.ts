import { createClient } from '@/lib/supabase/client';
import { weightRecord } from '../../domain/entities/weightRecord.entity';
import { weightRecordRepository } from '../../domain/repositories/weightRecord.repository';
import { weightRecordListResponseDto, weightRecordResponseDto } from '@/src/application/dtos/weightRecord.dto';

//Interfas para GetAll
interface SupabaseWeightRecord {
  id: string;
  PetId: string;
  Weight: number;
  Date: string | null;
  Note: string | null;
  Created_at: string;
}

export class SupabaseWeightRecordRepository implements weightRecordRepository {
  //Add
  async save(record: weightRecord): Promise<weightRecordResponseDto> {
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

  return({
    message: 'WeightRecord creado correctamente',
    id: data.id,
    petId: data.PetId,
    weight: data.Weight ?? undefined,
    date: data.Date ?? undefined,
    note: data.Note ?? undefined,
    createdAt: new Date(data.Created_at).toISOString(),
  });
}
  //GetAll
  async findAll(): Promise<weightRecordListResponseDto[]> {
    const { data, error } = await createClient()
      .from('WeightRecord')
      .select('*')
      .order('Created_at', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo registros: ${error.message}`);
    }

    return data.map((item: SupabaseWeightRecord) => ({
      id: item.id,
      petId: item.PetId,
      weight: item.Weight ?? undefined,
      date: item.Date ?? undefined,
      note: item.Note ?? undefined,
      createdAt: new Date(item.Created_at).toISOString(),
    }));
  }

  //Update
  async updateWeightByPetId(petId: string, weight: number): Promise<weightRecordResponseDto> {
    const { data, error }= await createClient()
    .from('WeightRecord')
    .update ({Weight: weight})
    .eq('PetId', petId)
    .select()
    .maybeSingle()
    if(error){
      throw new Error (`Error al actualizar peso: ${error.message}`);
    }
    if (!data) {
      throw new Error(`No se encontró ningún WeightRecord con petId: ${petId}`);
    }

const record = data;
    return {
      message: 'Peso actualizado',
      id: record.id,
      petId: record.PetId,
      weight: record.Weight,
      date: record.Date ?? undefined,
      note: record.Note ?? undefined,
      createdAt: new Date(record.Created_at).toISOString(),
    };
  }
}