import { Medication } from '@/src/domain/entities/medicacion-treatment.entity';
import { MedicationResponseDTO } from '@/src/application/dtos/medication-treatment.dto';

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