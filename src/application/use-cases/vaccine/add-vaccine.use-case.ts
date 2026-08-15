// src/domain/use-cases/add-vaccine.use-case.ts
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { CreateVaccineDTO } from '@/src/application/dtos/vaccine.dto';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';

export class AddVaccineUseCase {
  constructor(private readonly vaccineRepository: IVaccineRepository) {}

  async execute(dto: CreateVaccineDTO): Promise<Vaccine> {
    // 1. Validaciones básicas
    if (!dto.petId) throw new Error('El ID de la mascota es requerido');
    if (!dto.name) throw new Error('El nombre de la vacuna es requerido');
    if (!dto.applicationDate) throw new Error('La fecha de aplicación es requerida');

    // 2. Validar que la fecha de aplicación no sea futura
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dto.applicationDate > today) {
      throw new Error('La fecha de aplicación no puede ser futura');
    }

    // 3. Validar que la próxima dosis sea posterior a la aplicación (si se proporcionó)
    if (dto.nextDoseDate && dto.nextDoseDate <= dto.applicationDate) {
      throw new Error('La próxima dosis debe ser posterior a la fecha de aplicación');
    }

    // 4. Convertir DTO a datos de dominio
    const vaccineData = VaccineMapper.toDomain(dto);
    
    // 5. Guardar en el repositorio
    return await this.vaccineRepository.addVaccine(vaccineData);
  }
}