import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentResponseDTO } from '../dtos/treatment.dto';

export class TreatmentMapper {
  static toDTO(treatment: Treatment): TreatmentResponseDTO {
    return {
      id: treatment.id,
      visitId: treatment.visitId,
      description: treatment.description,
      startDate: treatment.startDate.toISOString().split('T')[0],
      endDate: treatment.endDate?.toISOString().split('T')[0] || null,
      notes: treatment.notes,
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
    };
  }
}