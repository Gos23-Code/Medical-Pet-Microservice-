import { Medication } from '../entities/medication.entity';

export interface MedicationRepository {
  save(medication: Medication): Promise<Medication>;
  findByTreatmentId(treatmentId: string): Promise<Medication[]>;
}