import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';

export class GetVisitsByDateRangeUseCase {
  constructor(private repository: VeterinaryVisitRepository) {}

  async execute(startDate: Date, endDate: Date): Promise<VeterinaryVisit[]> {
    if (!startDate) {
      throw new Error('La fecha de inicio es requerida');
    }
    
    if (!endDate) {
      throw new Error('La fecha de fin es requerida');
    }
    
    if (startDate > endDate) {
      throw new Error('La fecha de inicio debe ser menor a la fecha de fin');
    }
    
    return await this.repository.findByDateRange(startDate, endDate);
  }
}