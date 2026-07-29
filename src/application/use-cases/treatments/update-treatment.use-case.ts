import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';
import { UpdateTreatmentDTO } from '@/src/application/dtos/treatment.dto';

export class UpdateTreatmentUseCase {
  constructor(private repository: TreatmentRepository) {}

  async execute(id: string, dto: UpdateTreatmentDTO): Promise<void> {
    const treatment = await this.repository.findById(id);
    
    if (!treatment) {
      throw new Error('Tratamiento no encontrado');
    }

    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const newStartDate = dto.startDate ? new Date(dto.startDate) : undefined;
      const newEndDate = dto.endDate !== undefined 
        ? (dto.endDate ? new Date(dto.endDate) : null) 
        : undefined;
      treatment.updateDates(newStartDate, newEndDate);
    }


    await this.repository.update(treatment);
  }
}