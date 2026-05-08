import { createClient } from '@/lib/supabase/client';
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
    });
  }

  private toPersistence(medication: Medication) {
    return {
      id: medication.id,
      treatment_id: medication.treatmentId,
      name: medication.name,
      dosage: medication.dosage.value,
      frequency: medication.frequency.value,
      duration: medication.duration,
      created_at: medication.createdAt.toISOString(),
    };
  }

  async save(medication: Medication): Promise<Medication> {
    // Verificar que el tratamiento existe
    const { data: treatment, error: treatmentError } = await this.supabase
      .from('treatments')
      .select('id')
      .eq('id', medication.treatmentId)
      .single();
    
    if (treatmentError || !treatment) {
      throw new Error('Tratamiento no encontrado');
    }
    
    const { data, error } = await this.supabase
      .from('medications')
      .insert(this.toPersistence(medication))
      .select()
      .single();

    if (error) throw new Error(`Error al guardar: ${error.message}`);
    return this.toDomain(data as SupabaseMedicationRecord);
  }

  async findByTreatmentId(treatmentId: string): Promise<Medication[]> {
    const { data, error } = await this.supabase
      .from('medications')
      .select('*')
      .eq('treatment_id', treatmentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al buscar: ${error.message}`);
    return (data || []).map(record => this.toDomain(record as SupabaseMedicationRecord));
  }
}