import { createClient } from '@/src/infrastructure/database/supabase/client';
import { Medication } from '@/src/domain/entities/medication.entity';
import { MedicationRepository } from '@/src/domain/repositories/medication.repository';
import { Dosage } from '@/src/domain/value-objects/dosage.vo';
import { Frequency } from '@/src/domain/value-objects/frequency.vo';

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

export class SupabaseMedicationRepository implements MedicationRepository {
  private supabase = createClient();

  private toDomain(record: SupabaseMedicationRecord): Medication {
    return Medication.reconstitute({
      id: record.id,
      treatmentId: record.treatment_id,
      name: record.name,
      dosage: new Dosage(record.dosage),
      frequency: new Frequency(record.frequency),
      duration: record.duration,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  async findById(id: string): Promise<Medication | null> {
    const { data, error } = await this.supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data as SupabaseMedicationRecord);
  }

  async update(medication: Medication): Promise<Medication> {
    const { data, error } = await this.supabase
      .from('medications')
      .update({
        dosage: medication.dosage.value,
        frequency: medication.frequency.value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medication.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar: ${error.message}`);
    return this.toDomain(data as SupabaseMedicationRecord);
  }
}