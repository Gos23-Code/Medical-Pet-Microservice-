// src/application/use-cases/treatments/get-treatment.use-case.ts
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository, TreatmentWithMedicationsResult } from '@/src/domain/repositories/treatment.repository';

export class GetTreatmentUseCase {
  constructor(private repository: TreatmentRepository) {}

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