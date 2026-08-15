// src/application/mappers/vaccine.mapper.ts
import { Vaccine, CreateVaccineData, UpdateVaccineData } from '@/src/domain/entities/vaccine.entity';
import { CreateVaccineDTO, VaccineResponseDTO, UpdateVaccineDTO } from '../dtos/vaccine.dto';

export class VaccineMapper {
  static toDomain(dto: CreateVaccineDTO): CreateVaccineData {
    return {
      petId: dto.petId,
      name: dto.name,
      lotNumber: dto.lotNumber ?? null,
      applicationDate: dto.applicationDate,
      nextDoseDate: dto.nextDoseDate ?? null,
      veterinarian: dto.veterinarian ?? null,
      notes: dto.notes ?? null
    };
  }

  static toDTO(vaccine: Vaccine): VaccineResponseDTO {
    return {
      id: vaccine.id,
      petId: vaccine.petId,
      name: vaccine.nameValue,
      lotNumber: vaccine.lotNumber,
      applicationDate: vaccine.applicationDate,
      nextDoseDate: vaccine.nextDoseDateValue,
      veterinarian: vaccine.veterinarian,
      notes: vaccine.notes,
      createdAt: vaccine.createdAt,
      isDue: vaccine.isDue(),
      daysUntilDue: vaccine.daysUntilDue()
    };
  }

  static toDomainForUpdate(dto: UpdateVaccineDTO): UpdateVaccineData {
    const updates: UpdateVaccineData = {};
    
    if (dto.petId !== undefined) updates.petId = dto.petId;
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.lotNumber !== undefined) updates.lotNumber = dto.lotNumber;
    if (dto.applicationDate !== undefined) updates.applicationDate = dto.applicationDate;
    if (dto.nextDoseDate !== undefined) updates.nextDoseDate = dto.nextDoseDate;
    if (dto.veterinarian !== undefined) updates.veterinarian = dto.veterinarian;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    
    return updates;
  }
}