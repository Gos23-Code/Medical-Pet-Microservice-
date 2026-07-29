import { Medication } from '../entities/medicacion-treatment.entity';

export interface MedicationRepository {
  save(medication: Medication): Promise<Medication>;
  findByTreatmentId(treatmentId: string): Promise<Medication[]>;
}