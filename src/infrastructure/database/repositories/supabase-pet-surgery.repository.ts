// src/infrastructure/repositories/supabase-pet-surgery.repository.ts
import { supabase } from '@/src/infrastructure/database/supabase/client-surgery';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';
import { 
  PetSurgeryStatus, 
  PetSurgeryOutcome 
} from '@/src/domain/entities/pet-surgery.entity';

// Interfaz para la fila de la base de datos
export interface PetSurgeryRow {
  id: string;
  pet_id: string;
  veterinary_visit_id: string;
  title: string;
  description: string;
  surgery_date: string;
  duration_minutes: number;
  anesthesia_used?: string | null;
  complications?: string | null;
  post_op_instructions?: string | null;
  outcome?: string | null;
  status: string;
  next_checkup_date?: string | null;
  created_at: string;
  updated_at: string;
}

// Validadores de tipo
const VALID_STATUSES: PetSurgeryStatus[] = [
  'SCHEDULED', 
  'IN_PROGRESS', 
  'COMPLETED', 
  'COMPLICATED', 
  'CANCELLED'
];

const VALID_OUTCOMES: PetSurgeryOutcome[] = [
  'SUCCESSFUL', 
  'COMPLICATIONS', 
  'DECEASED'
];

function parseStatus(status: string): PetSurgeryStatus {
  if (!VALID_STATUSES.includes(status as PetSurgeryStatus)) {
    throw new Error(`Invalid status value: ${status}`);
  }
  return status as PetSurgeryStatus;
}

function parseOutcome(outcome: string | null | undefined): PetSurgeryOutcome | null {
  if (!outcome) return null;
  if (!VALID_OUTCOMES.includes(outcome as PetSurgeryOutcome)) {
    throw new Error(`Invalid outcome value: ${outcome}`);
  }
  return outcome as PetSurgeryOutcome;
}

// Mapper para convertir entre entidad y fila de BD
export class PetSurgeryMapper {
  static toDomain(row: PetSurgeryRow): PetSurgery {
    return PetSurgery.reconstitute({
      id: row.id,
      petId: row.pet_id,
      veterinaryVisitId: row.veterinary_visit_id,
      title: row.title,
      description: row.description,
      surgeryDate: new Date(row.surgery_date),
      durationMinutes: row.duration_minutes,
      anesthesiaUsed: row.anesthesia_used ?? null,
      complications: row.complications ?? null,
      postOpInstructions: row.post_op_instructions ?? null,
      outcome: parseOutcome(row.outcome),
      status: parseStatus(row.status),
      nextCheckupDate: row.next_checkup_date ? new Date(row.next_checkup_date) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toPersistence(surgery: PetSurgery): PetSurgeryRow {
    const props = surgery.toJSON();
    return {
      id: props.id,
      pet_id: props.petId,
      veterinary_visit_id: props.veterinaryVisitId,
      title: props.title,
      description: props.description,
      surgery_date: props.surgeryDate.toISOString().split('T')[0],
      duration_minutes: props.durationMinutes,
      anesthesia_used: props.anesthesiaUsed ?? null,
      complications: props.complications ?? null,
      post_op_instructions: props.postOpInstructions ?? null,
      outcome: props.outcome ?? null,
      status: props.status,
      next_checkup_date: props.nextCheckupDate ? props.nextCheckupDate.toISOString().split('T')[0] : null,
      created_at: props.createdAt.toISOString(),
      updated_at: props.updatedAt.toISOString(),
    };
  }

  // Método para actualización parcial (solo campos que cambiaron)
  static toPartialPersistence(surgery: PetSurgery): Partial<PetSurgeryRow> {
    const props = surgery.toJSON();
    const partial: Partial<PetSurgeryRow> = {
      updated_at: new Date().toISOString(),
    };
    
    // Solo incluir campos que tienen valor
    if (props.title !== undefined) partial.title = props.title;
    if (props.description !== undefined) partial.description = props.description;
    if (props.surgeryDate !== undefined) {
      partial.surgery_date = props.surgeryDate.toISOString().split('T')[0];
    }
    if (props.durationMinutes !== undefined) partial.duration_minutes = props.durationMinutes;
    if (props.anesthesiaUsed !== undefined) partial.anesthesia_used = props.anesthesiaUsed ?? null;
    if (props.complications !== undefined) partial.complications = props.complications ?? null;
    if (props.postOpInstructions !== undefined) partial.post_op_instructions = props.postOpInstructions ?? null;
    if (props.outcome !== undefined) partial.outcome = props.outcome ?? null;
    if (props.status !== undefined) partial.status = props.status;
    if (props.nextCheckupDate !== undefined) {
      partial.next_checkup_date = props.nextCheckupDate ? props.nextCheckupDate.toISOString().split('T')[0] : null;
    }
    
    return partial;
  }
}

export class SupabasePetSurgeryRepository implements PetSurgeryRepository {
  
  async save(surgery: PetSurgery): Promise<void> {
    const persistence = PetSurgeryMapper.toPersistence(surgery);
    
    const { error } = await supabase
      .from('pet_surgeries')
      .insert([persistence]);

    if (error) {
      throw new Error(`Failed to save surgery: ${error.message}`);
    }
  }

  async findById(id: string): Promise<PetSurgery | null> {
    const { data, error } = await supabase
      .from('pet_surgeries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find surgery: ${error.message}`);
    }

    if (!data) return null;

    return PetSurgeryMapper.toDomain(data as PetSurgeryRow);
  }

  async update(surgery: PetSurgery): Promise<void> {
    // Usar actualización parcial en lugar de completa
    const partialUpdate = PetSurgeryMapper.toPartialPersistence(surgery);
    
    const { error } = await supabase
      .from('pet_surgeries')
      .update(partialUpdate)
      .eq('id', surgery.id);

    if (error) {
      throw new Error(`Failed to update surgery: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pet_surgeries')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete surgery: ${error.message}`);
    }
  }

  async findByVisitId(visitId: string): Promise<PetSurgery[]> {
    const { data, error } = await supabase
      .from('pet_surgeries')
      .select('*')
      .eq('veterinary_visit_id', visitId)
      .order('surgery_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to find surgeries by visit: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    return data.map((row: PetSurgeryRow) => PetSurgeryMapper.toDomain(row));
  }

  async findByPetId(petId: string): Promise<PetSurgery[]> {
    const { data, error } = await supabase
      .from('pet_surgeries')
      .select('*')
      .eq('pet_id', petId)
      .order('surgery_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to find surgeries by pet: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    return data.map((row: PetSurgeryRow) => PetSurgeryMapper.toDomain(row));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<PetSurgery[]> {
    const { data, error } = await supabase
      .from('pet_surgeries')
      .select('*')
      .gte('surgery_date', startDate.toISOString().split('T')[0])
      .lte('surgery_date', endDate.toISOString().split('T')[0])
      .order('surgery_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to find surgeries by date range: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    return data.map((row: PetSurgeryRow) => PetSurgeryMapper.toDomain(row));
  }

  async findByStatus(status: PetSurgeryStatus): Promise<PetSurgery[]> {
    const { data, error } = await supabase
      .from('pet_surgeries')
      .select('*')
      .eq('status', status)
      .order('surgery_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to find surgeries by status: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    return data.map((row: PetSurgeryRow) => PetSurgeryMapper.toDomain(row));
  }

  async updateStatus(id: string, status: PetSurgeryStatus): Promise<void> {
    const { error } = await supabase
      .from('pet_surgeries')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update surgery status: ${error.message}`);
    }
  }

  async getStatistics(petId?: string): Promise<{
    total: number;
    byStatus: Record<PetSurgeryStatus, number>;
    averageDuration: number;
    successRate: number;
  }> {
    let query = supabase
      .from('pet_surgeries')
      .select('status, outcome, duration_minutes');

    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }

    const byStatus: Record<PetSurgeryStatus, number> = {
      'SCHEDULED': 0,
      'IN_PROGRESS': 0,
      'COMPLETED': 0,
      'COMPLICATED': 0,
      'CANCELLED': 0
    };
    
    let totalDuration = 0;
    let completedCount = 0;
    let successfulCount = 0;

    if (data) {
      for (const row of data) {
        const status = row.status as PetSurgeryStatus;
        if (byStatus.hasOwnProperty(status)) {
          byStatus[status]++;
        }

        if (row.duration_minutes) {
          totalDuration += row.duration_minutes;
        }

        if (row.status === 'COMPLETED') {
          completedCount++;
          if (row.outcome === 'SUCCESSFUL') {
            successfulCount++;
          }
        }
      }
    }

    return {
      total: data?.length || 0,
      byStatus,
      averageDuration: data?.length ? totalDuration / data.length : 0,
      successRate: completedCount ? (successfulCount / completedCount) * 100 : 0,
    };
  }
}