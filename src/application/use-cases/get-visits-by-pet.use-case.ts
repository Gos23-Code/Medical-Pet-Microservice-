import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';

export class GetVisitsByPetUseCase {
  constructor(private repository: VeterinaryVisitRepository) {}

  async execute(petId: string): Promise<VeterinaryVisit[]> {
    if (!petId) {
      throw new Error('El ID de la mascota es requerido');
    }
    
    return await this.repository.findByPetId(petId);
  }
}