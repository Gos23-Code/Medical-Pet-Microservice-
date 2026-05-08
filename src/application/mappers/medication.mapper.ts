import { Medication } from '@/src/domain/entities/medication.entity';
import { MedicationResponseDTO } from '../dtos/medication.dto';

export class MedicationMapper {
  static toDTO(medication: Medication): MedicationResponseDTO {
    return {
      id: medication.id,
      treatmentId: medication.treatmentId,
      name: medication.name,
      dosage: medication.dosage.value,
      frequency: medication.frequency.value,
      duration: medication.duration,
      createdAt: medication.createdAt.toISOString(),
    };
  }
}