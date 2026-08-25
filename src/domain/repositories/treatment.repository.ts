// src/domain/repositories/treatment.repository.ts
import { Treatment } from '@/src/domain/entities/treatment.entity';

export interface Medication {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: Date;
  updatedAt: Date;
}

// 👈 Nuevo tipo para el resultado con medicamentos
export interface TreatmentWithMedicationsResult {
  treatment: Treatment;
  medications: Medication[];
}

export interface TreatmentRepository {
  save(treatment: Treatment): Promise<Treatment>;
  findById(id: string): Promise<Treatment | null>;
  findByIdWithMedications(id: string): Promise<TreatmentWithMedicationsResult | null>; // 👈 Cambiado
  update(treatment: Treatment): Promise<Treatment>;
}