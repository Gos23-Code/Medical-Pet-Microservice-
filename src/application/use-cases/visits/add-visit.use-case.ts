import { v4 as uuidv4 } from 'uuid';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';
import { Weight } from '@/src/domain/value-objects/weight.vo';
import { Temperature } from '@/src/domain/value-objects/temperature.vo';
import { CreateVisitDTO } from '@/src/application/dtos/veterinary-visit.dto';

export class AddVisitUseCase {
  constructor(private repository: VeterinaryVisitRepository) {}

  async execute(dto: CreateVisitDTO): Promise<VeterinaryVisit> {
    // Validaciones
    if (!dto.petId) {
      throw new Error('El ID de la mascota es requerido');
    }
    
    if (!dto.reason) {
      throw new Error('El motivo es requerido');
    }
    
    if (!dto.veterinarian) {
      throw new Error('El veterinario es requerido');
    }
    
    // Usar undefined en lugar de null
    const weight = dto.weight !== undefined && dto.weight !== null 
      ? new Weight(dto.weight) 
      : undefined;
    
    const temperature = dto.temperature !== undefined && dto.temperature !== null 
      ? new Temperature(dto.temperature) 
      : undefined;
    
    const visit = VeterinaryVisit.create({
      id: uuidv4(),
      petId: dto.petId,
      date: new Date(dto.date),
      reason: dto.reason,
      diagnosis: dto.diagnosis,
      veterinarian: dto.veterinarian,
      notes: dto.notes,
      weight,
      temperature,
    });

    return await this.repository.save(visit);
  }
}