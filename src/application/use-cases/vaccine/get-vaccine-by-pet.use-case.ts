// src/domain/use-cases/get-vaccines-by-pet.use-case.ts
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';

export class GetVaccinesByPetUseCase {
  constructor(private readonly vaccineRepository: IVaccineRepository) {}

  async execute(petId: string): Promise<Vaccine[]> {
    // 1. Validación
    if (!petId) throw new Error('El ID de la mascota es requerido');

    // 2. Obtener vacunas del repositorio
    return await this.vaccineRepository.getByPetId(petId);
  }
}