import { createClient } from '@/src/infrastructure/database/supabase/client';
import { weightRecord } from '@/src/domain/entities/weight-record.entity';
import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { weightRecordListResponseDto,
        weightRecordResponseDto,
        weightRecordByPetIdResponseDto,
        weightRecordLatestResponseDto } from '@/src/application/dtos/weight-record.dto';

//Interfas para GetAll
interface SupabaseWeightRecord {
  id: string;
  PetId: string;
  Weight: number;
  Date: string | null;
  Note: string | null;
  Created_at: string;
}

//Interfas para GetWeightByPetId
interface SupabaseWeightRecordByPetId {
  PetId: string;
  Weight: number;
}

export class SupabaseWeightRecordRepository implements weightRecordRepository {
  //Add
  async save(record: weightRecord): Promise<weightRecordResponseDto> {
  const { data, error } = await createClient()
    .from('WeightRecord')
    .insert({
      PetId: record.petId ?? null,
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

  //ListWeightRecord By PetId
  async findByPetId(petId: string): Promise<weightRecordByPetIdResponseDto[]> {
    const {data, error}= await createClient()
    .from('WeightRecord')
    .select('PetId, Weight')
    .eq('PetId', petId)
    .order('Created_at', { ascending: false });

    if(error){
      throw new Error (`Error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`No se encontraron registros para petId: ${petId}`);
    }

    return data.map((item: SupabaseWeightRecordByPetId) => ({
    petId: item.PetId,
    weight: item.Weight ?? undefined,
    }));
  
  }

  //GetLatestByPetId
  async getLatestByPetId(petId: string): Promise<weightRecordLatestResponseDto> {
    const { data, error } = await createClient()
    .from('WeightRecord')
    .select('PetId, Weight, Date')
    .eq('PetId', petId)
    .order('Created_at', { ascending: false })
    .limit(1)
    .single();

    if (error) {
      throw new Error(`Error obteniendo último peso: ${error.message}`);
    }

    return {
      petId: data.PetId,
      weight: data.Weight ?? undefined,
      date: data.Date ?? undefined,
    };
  }

 //Update
async updateWeightByPetId(petId: string, weight: number): Promise<weightRecordResponseDto> {
  // Primero obtener el registro más reciente
  const { data: latestData, error: findError } = await createClient()
    .from('WeightRecord')
    .select('id')
    .eq('PetId', petId)
    .order('Created_at', { ascending: false })
    .limit(1)
    .single();

  if (findError) {
    throw new Error(`Error al encontrar el registro más reciente: ${findError.message}`);
  }

  if (!latestData) {
    throw new Error(`No se encontró ningún WeightRecord con petId: ${petId}`);
  }

  // Actualizar por ID específico
  const { data, error } = await createClient()
    .from('WeightRecord')
    .update({ Weight: weight })
    .eq('id', latestData.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar peso: ${error.message}`);
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