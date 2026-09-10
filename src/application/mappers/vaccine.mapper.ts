// src/application/mappers/vaccine.mapper.ts
import { Vaccine, CreateVaccineData, UpdateVaccineData, VaccineStatus } from '@/src/domain/entities/vaccine.entity';
import { CreateVaccineDTO, VaccineResponseDTO, UpdateVaccineDTO, VaccineStatusDTO } from '../dtos/vaccine.dto';

export class VaccineMapper {
  // ✅ toDomain: SIN userId (no se guarda en BD)
  static toDomain(dto: CreateVaccineDTO): CreateVaccineData {
    return {
      petId: dto.petId,
      // ❌ userId: dto.userId,  // NO se guarda en BD
      name: dto.name,
      lotNumber: dto.lotNumber ?? null,
      applicationDate: dto.applicationDate,
      nextDoseDate: dto.nextDoseDate ?? null,
      veterinarian: dto.veterinarian ?? null,
      notes: dto.notes ?? null
    };
  }

  // ✅ toDTO: userId se pasa como parámetro
  static toDTO(vaccine: Vaccine, userId: string): VaccineResponseDTO {
    return {
      id: vaccine.id,
      petId: vaccine.petId,
      userId: userId,  // ✅ userId del parámetro
      name: vaccine.nameValue,
      lotNumber: vaccine.lotNumber,
      applicationDate: vaccine.applicationDate,
      nextDoseDate: vaccine.nextDoseDateValue,
      veterinarian: vaccine.veterinarian,
      notes: vaccine.notes,
      createdAt: vaccine.createdAt,
      updatedAt: vaccine.updatedAt,
      isDue: vaccine.isDue(),
      daysUntilDue: vaccine.daysUntilDue(),
      status: this.toDTOStatus(vaccine.status),
      reminderCount: vaccine.reminderCount || 0,
      lastReminderSentAt: vaccine.lastReminderSentAt || null,
    };
  }

  // ✅ toDTOList: para listas de vacunas
  static toDTOList(vaccines: Vaccine[], userId: string): VaccineResponseDTO[] {
    return vaccines.map(vaccine => this.toDTO(vaccine, userId));
  }

  // ✅ toDomainForUpdate: SIN userId (no se guarda en BD)
  static toDomainForUpdate(dto: UpdateVaccineDTO): UpdateVaccineData {
    const updates: UpdateVaccineData = {};
    
    if (dto.petId !== undefined) updates.petId = dto.petId;
    // ❌ if (dto.userId !== undefined) updates.userId = dto.userId;  // NO se guarda en BD
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.lotNumber !== undefined) updates.lotNumber = dto.lotNumber;
    if (dto.applicationDate !== undefined) updates.applicationDate = dto.applicationDate;
    if (dto.nextDoseDate !== undefined) updates.nextDoseDate = dto.nextDoseDate;
    if (dto.veterinarian !== undefined) updates.veterinarian = dto.veterinarian;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    
    return updates;
  }

  // ✅ Convertir status de DTO a dominio (para actualizaciones)
  static toDomainStatus(dto: UpdateVaccineDTO): VaccineStatus | undefined {
    if (!dto.status) return undefined;
    
    const statusMap: Record<VaccineStatusDTO, VaccineStatus> = {
      'PENDIENTE': VaccineStatus.PENDING,
      'APLICADO': VaccineStatus.APPLIED,
      'RETRASADO': VaccineStatus.DELAYED
    };
    
    return statusMap[dto.status];
  }

  // ✅ Convertir status de dominio a DTO (para respuestas)
  static toDTOStatus(status: VaccineStatus): VaccineStatusDTO {
    const statusMap: Record<VaccineStatus, VaccineStatusDTO> = {
      [VaccineStatus.PENDING]: 'PENDIENTE',
      [VaccineStatus.APPLIED]: 'APLICADO',
      [VaccineStatus.DELAYED]: 'RETRASADO'
    };
    
    return statusMap[status];
  }

  // ✅ Convertir un DTO de actualización a datos de actualización incluyendo status
  static toUpdateData(dto: UpdateVaccineDTO): {
    data: UpdateVaccineData;
    status?: VaccineStatus;
  } {
    const data = this.toDomainForUpdate(dto);
    const status = this.toDomainStatus(dto);
    
    return { data, status };
  }
}