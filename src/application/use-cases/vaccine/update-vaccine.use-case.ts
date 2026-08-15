// src/application/use-cases/vaccine/update-vaccine.use-case.ts
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { UpdateVaccineDTO } from '@/src/application/dtos/vaccine.dto';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';

export class UpdateVaccineUseCase {
  constructor(private readonly vaccineRepository: IVaccineRepository) {}

  async execute(dto: UpdateVaccineDTO): Promise<Vaccine> {
    // Validación
    if (!dto.id) throw new Error('El ID de la vacuna es requerido');

    // Verificar que la vacuna existe
    const existingVaccine = await this.vaccineRepository.getById(dto.id);
    if (!existingVaccine) {
      throw new Error('Vacuna no encontrada');
    }

    // Validar que la fecha de aplicación no sea futura (si se actualiza)
    if (dto.applicationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dto.applicationDate > today) {
        throw new Error('La fecha de aplicación no puede ser futura');
      }
    }

    // Validar próxima dosis (si se actualiza)
    const newAppDate = dto.applicationDate ?? existingVaccine.applicationDate;
    const newNextDose = dto.nextDoseDate !== undefined 
      ? dto.nextDoseDate 
      : existingVaccine.nextDoseDateValue;
    
    if (newNextDose && newNextDose <= newAppDate) {
      throw new Error('La próxima dosis debe ser posterior a la fecha de aplicación');
    }

    // Convertir DTO a datos de actualización
    const updateData = VaccineMapper.toDomainForUpdate(dto);

    // Actualizar en el repositorio
    return await this.vaccineRepository.updateVaccine(dto.id, updateData);
  }
}