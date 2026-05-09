import { v4 as uuidv4 } from 'uuid';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';
import { CreateTreatmentDTO } from '../dtos/treatment.dto';

export class AddTreatmentUseCase {
  constructor(private repository: TreatmentRepository) {}

  async execute(dto: CreateTreatmentDTO): Promise<Treatment> {
    // Validaciones
    if (!dto.visitId) {
      throw new Error('El ID de la visita es requerido');
    }
    
    if (!dto.description) {
      throw new Error('La descripción del tratamiento es requerida');
    }
    
    if (!dto.startDate) {
      throw new Error('La fecha de inicio es requerida');
    }
    
    // ✅ VALIDACIÓN FALTANTE: endDate no puede ser menor que startDate
    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new Error('La fecha de fin no puede ser menor a la fecha de inicio');
    }
    
    const treatment = Treatment.create({
      id: uuidv4(),
      visitId: dto.visitId,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      notes: dto.notes || null,
    });

    return await this.repository.save(treatment);
  }
}