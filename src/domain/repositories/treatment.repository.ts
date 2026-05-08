import { Treatment } from '../entities/treatment.entity';

export interface TreatmentRepository {
  save(treatment: Treatment): Promise<Treatment>;
  findById(id: string): Promise<Treatment | null>;
}