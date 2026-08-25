// src/infrastructure/database/repositories/supabase-treatment.repository.ts
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository, TreatmentWithMedicationsResult, Medication } from '@/src/domain/repositories/treatment.repository';

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

interface SupabaseMedicationRecord {
  id: string;
  treatment_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
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

  private toDomainMedication(record: SupabaseMedicationRecord): Medication {
    return {
      id: record.id,
      treatmentId: record.treatment_id,
      name: record.name,
      dosage: record.dosage,
      frequency: record.frequency,
      duration: record.duration,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
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

  // 👈 NUEVO: Obtener tratamiento con sus medicamentos
  async findByIdWithMedications(id: string): Promise<TreatmentWithMedicationsResult | null> {
    // Primero obtener el tratamiento
    const treatment = await this.findById(id);
    if (!treatment) return null;

    // Luego obtener sus medicamentos
    const { data: medications, error } = await this.supabase
      .from('medications')
      .select('*')
      .eq('treatment_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching medications:', error);
      return {
        treatment, // 👈 Retorna el objeto Treatment directamente
        medications: []
      };
    }

    return {
      treatment, // 👈 Retorna el objeto Treatment directamente
      medications: medications?.map(this.toDomainMedication) || []
    };
  }

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