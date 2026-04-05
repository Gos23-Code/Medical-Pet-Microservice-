import { v4 as uuidv4 } from 'uuid';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';
import { CreateVisitDTO } from '../dtos/veterinary-visit.dto';

export class AddVisitUseCase {
  constructor(private repository: VeterinaryVisitRepository) {}

  async execute(dto: CreateVisitDTO): Promise<VeterinaryVisit> {
    // Validaciones
    if (!dto.petId) throw new Error('El ID de la mascota es requerido');
    if (!dto.reason) throw new Error('El motivo es requerido');
    if (!dto.veterinarian) throw new Error('El veterinario es requerido');
    
    if (dto.weight && (dto.weight <= 0 || dto.weight >= 200)) {
      throw new Error('El peso debe estar entre 0 y 200 kg');
    }
    
    if (dto.temperature && (dto.temperature < 35 || dto.temperature > 42)) {
      throw new Error('La temperatura debe estar entre 35°C y 42°C');
    }

    const visit = VeterinaryVisit.create({
      id: uuidv4(),
      petId: dto.petId,
      date: new Date(dto.date),
      reason: dto.reason,
      diagnosis: dto.diagnosis,
      veterinarian: dto.veterinarian,
      notes: dto.notes,
      weight: dto.weight,
      temperature: dto.temperature,
    });

    return await this.repository.save(visit);
  }
}