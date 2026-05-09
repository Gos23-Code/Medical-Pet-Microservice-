import { MedicationRepository } from '@/src/domain/repositories/medication.repository';
import { UpdateMedicationDTO } from '../dtos/medication.dto';

export class UpdateMedicationUseCase {
  constructor(private repository: MedicationRepository) {}

  async execute(id: string, dto: UpdateMedicationDTO): Promise<void> {
    const medication = await this.repository.findById(id);
    
    if (!medication) {
      throw new Error('Medicación no encontrada');
    }

    if (dto.dosage !== undefined) {
      medication.updateDosage(dto.dosage);
    }

    if (dto.frequency !== undefined) {
      medication.updateFrequency(dto.frequency);
    }

    await this.repository.update(medication);
  }
}