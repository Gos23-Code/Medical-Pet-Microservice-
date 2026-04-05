import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VisitResponseDTO } from '../dtos/veterinary-visit.dto';

export class VeterinaryVisitMapper {
  static toDTO(visit: VeterinaryVisit): VisitResponseDTO {
    return {
      id: visit.id,
      petId: visit.petId,
      date: visit.date.toISOString().split('T')[0],
      reason: visit.reason,
      diagnosis: visit.diagnosis,
      veterinarian: visit.veterinarian,
      notes: visit.notes,
      weight: visit.weight,
      temperature: visit.temperature,
      createdAt: visit.createdAt.toISOString(),
      updatedAt: visit.updatedAt.toISOString(),
    };
  }

  static toDTOList(visits: VeterinaryVisit[]): VisitResponseDTO[] {
    return visits.map(visit => this.toDTO(visit));
  }
}