import { Medication } from '@/src/domain/entities/medication.entity';

export interface MedicationRepository {
  findById(id: string): Promise<Medication | null>;
  update(medication: Medication): Promise<Medication>;
}