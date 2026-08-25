// src/application/use-cases/treatments/get-treatment.use-case.ts
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository, TreatmentWithMedicationsResult } from '@/src/domain/repositories/treatment.repository';

export class GetTreatmentUseCase {
  constructor(private repository: TreatmentRepository) {}

  // Sobrecargas: le dicen a TypeScript qué tipo devuelve según el argumento
  execute(id: string, includeMedications?: false): Promise<Treatment>;
  execute(id: string, includeMedications: true): Promise<TreatmentWithMedicationsResult>;
  async execute(id: string, includeMedications: boolean = false): Promise<Treatment | TreatmentWithMedicationsResult> {
    if (includeMedications) {
      const result = await this.repository.findByIdWithMedications(id);
      if (!result) {
        throw new Error('Tratamiento no encontrado');
      }
      return result;
    }

    const treatment = await this.repository.findById(id);
    if (!treatment) {
      throw new Error('Tratamiento no encontrado');
    }
    return treatment;
  }
}