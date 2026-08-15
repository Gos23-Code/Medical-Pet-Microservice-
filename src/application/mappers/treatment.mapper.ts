import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentResponseDTO, MedicationFromService } from '@/src/application/dtos/treatment.dto';

export class TreatmentMapper {
  static toDTO(treatment: Treatment, medications?: MedicationFromService[]): TreatmentResponseDTO & { medications?: MedicationFromService[] } {
    return {
      id: treatment.id,
      visitId: treatment.visitId,
      description: treatment.description,
      startDate: treatment.startDate.toISOString().split('T')[0],
      endDate: treatment.endDate?.toISOString().split('T')[0] || null,
      notes: treatment.notes,
      isActive: treatment.isActive(),
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
      medications: medications || [],
    };
  }

  static toDTOList(treatments: Treatment[]): TreatmentResponseDTO[] {
    return treatments.map(treatment => ({
      id: treatment.id,
      visitId: treatment.visitId,
      description: treatment.description,
      startDate: treatment.startDate.toISOString().split('T')[0],
      endDate: treatment.endDate?.toISOString().split('T')[0] || null,
      notes: treatment.notes,
      isActive: treatment.isActive(),
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
    }));
  }
}