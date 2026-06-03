import { createClient } from '@/lib/supabase/client';
import { LabTest } from '@/src/domain/entities/lasbTest.entity';
import { LabTestRepository } from '../../domain/repositories/labTest.repository';
import { labTestListResponseDto, LabTestResponseDto } from '../../application/dtos/labTest.dto';

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

  //GetByVisitId
  async findByVisistId(visit_id: string): Promise<labTestListResponseDto[]> {
    const {data, error}= await createClient()
    .from('lab_tests')
    .select('*')
    .eq('visit_id', visit_id)
    .order('created_at', {ascending: false});

    if(error){
      throw new Error(`Error en lab tests: ${error.message}`);
    }
    if(!data|| data.length===0){
      throw new Error(`No se encontró lab test con visit_id: ${visit_id}`);
    }
    return data.map((item: SupabaseLabTest)=>({
      id: item.id,
      visit_id: item.visit_id,
      name: item.name,
      result: item.result ?? undefined,
      normal_range: item.normal_range ?? undefined,
      date: item.date ?? undefined,
      notes: item.notes ?? undefined,
      created_at: new Date(item.created_at).toISOString(),
    }));
  }

  //UpdateResultByVisit_id
  async updateResultByVisitId(visit_id: string, result: string): Promise<LabTestResponseDto> {
    const {data, error}= await createClient()
    .from('lab_tests')
    .update({result: result})
    .eq('visit_id', visit_id)
    .select()
    .limit(1)
    .single();
    
    if(error){
      throw new Error(`Error al actualizar resultado:: ${error.message}`);
    }
    if(!data){
      throw new Error(`No se encontró lab test con visit_id: ${visit_id}`);
    }
    const record = data as SupabaseLabTest;
    return{
      message: 'Resultado actualizado',
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