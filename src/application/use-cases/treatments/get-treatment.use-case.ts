import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';

export class GetTreatmentUseCase {
  constructor(private repository: TreatmentRepository) {}

  async execute(id: string): Promise<Treatment> {
    const treatment = await this.repository.findById(id);
    
    if (!treatment) {
      throw new Error('Tratamiento no encontrado');
    }
    
    return treatment;
  }
}