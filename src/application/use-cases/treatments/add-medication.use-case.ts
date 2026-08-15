import { v4 as uuidv4 } from 'uuid';
import { Medication } from '@/src/domain/entities/medicacion-treatment.entity';
import { MedicationRepository } from '@/src/domain/repositories/medication-treatment.repository';
import { Dosage } from '@/src/domain/value-objects/dosage.vo';
import { Frequency } from '@/src/domain/value-objects/frequency.vo';
import { AddMedicationDTO } from '@/src/application/dtos/medication-treatment.dto';

export class AddMedicationUseCase {
  constructor(private repository: MedicationRepository) {}

  async execute(treatmentId: string, dto: AddMedicationDTO): Promise<Medication> {
    // Validaciones
    if (!treatmentId) {
      throw new Error('El ID del tratamiento es requerido');
    }
    
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('El nombre del medicamento es requerido');
    }
    
    if (!dto.dosage) {
      throw new Error('La dosis es requerida');
    }
    
    if (!dto.frequency) {
      throw new Error('La frecuencia es requerida');
    }
    
    if (!dto.duration) {
      throw new Error('La duración es requerida');
    }
    
    const medication = Medication.create({
      id: uuidv4(),
      treatmentId: treatmentId,
      name: dto.name,
      dosage: new Dosage(dto.dosage),
      frequency: new Frequency(dto.frequency),
      duration: dto.duration,
    });

    return await this.repository.save(medication);
  }
}