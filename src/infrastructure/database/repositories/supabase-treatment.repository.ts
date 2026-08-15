import { createClient } from '@/src/infrastructure/database/supabase/client';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';

interface SupabaseTreatmentRecord {
  id: string;
  visit_id: string;
  description: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseTreatmentRepository implements TreatmentRepository {
  private supabase = createClient();

  private toDomain(record: SupabaseTreatmentRecord): Treatment {
    return Treatment.reconstitute({
      id: record.id,
      visitId: record.visit_id,
      description: record.description,
      startDate: new Date(record.start_date),
      endDate: record.end_date ? new Date(record.end_date) : null,
      notes: record.notes,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  private toPersistence(treatment: Treatment) {
    return {
      id: treatment.id,
      visit_id: treatment.visitId,
      description: treatment.description,
      start_date: treatment.startDate.toISOString().split('T')[0],
      end_date: treatment.endDate?.toISOString().split('T')[0] || null,
      notes: treatment.notes,
      created_at: treatment.createdAt.toISOString(),
      updated_at: treatment.updatedAt.toISOString(),
    };
  }

  async save(treatment: Treatment): Promise<Treatment> {
    const { data, error } = await this.supabase
      .from('treatments')
      .insert(this.toPersistence(treatment))
      .select()
      .single();

    if (error) throw new Error(`Error al guardar: ${error.message}`);
    return this.toDomain(data as SupabaseTreatmentRecord);
  }

  async findById(id: string): Promise<Treatment | null> {
    const { data, error } = await this.supabase
      .from('treatments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data as SupabaseTreatmentRecord);
  }

  // ✅ AGREGAR EL MÉTODO UPDATE
  async update(treatment: Treatment): Promise<Treatment> {
    const { data, error } = await this.supabase
      .from('treatments')
      .update({
        start_date: treatment.startDate.toISOString().split('T')[0],
        end_date: treatment.endDate?.toISOString().split('T')[0] || null,
        notes: treatment.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', treatment.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar: ${error.message}`);
    return this.toDomain(data as SupabaseTreatmentRecord);
  }
}