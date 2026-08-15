import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';
import { UpdateVisitDTO } from '@/src/application/dtos/veterinary-visit.dto';

export class UpdateVisitUseCase {
  constructor(private repository: VeterinaryVisitRepository) {}

  async execute(id: string, dto: UpdateVisitDTO): Promise<void> {
    const visit = await this.repository.findById(id);
    
    if (!visit) {
      throw new Error('Visita no encontrada');
    }

    if (dto.diagnosis !== undefined) {
      visit.updateDiagnosis(dto.diagnosis);
    }

    if (dto.notes !== undefined) {
      visit.updateNotes(dto.notes);
    }

    await this.repository.update(visit);
  }
}