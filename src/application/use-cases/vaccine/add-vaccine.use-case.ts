// src/application/use-cases/vaccine/add-vaccine.use-case.ts
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { CreateVaccineDTO } from '@/src/application/dtos/vaccine.dto';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';
import { VaccinePublisher } from '@/src/infrastructure/pubsub/publishers/vaccine.publisher';

export class AddVaccineUseCase {
  constructor(
    private readonly vaccineRepository: IVaccineRepository,
    private readonly vaccinePublisher: VaccinePublisher,
  ) {}

  async execute(dto: CreateVaccineDTO): Promise<Vaccine> {
    // 1. Validaciones básicas
    if (!dto.petId) throw new Error('El ID de la mascota es requerido');
    if (!dto.userId) throw new Error('El ID del usuario es requerido');
    if (!dto.name) throw new Error('El nombre de la vacuna es requerido');
    if (!dto.applicationDate) throw new Error('La fecha de aplicación es requerida');

    if (dto.nextDoseDate && dto.nextDoseDate <= dto.applicationDate) {
      throw new Error('La próxima dosis debe ser posterior a la fecha de aplicación');
    }

    // 2. ✅ Guardar userId para usarlo después
    const userId = dto.userId;
    console.log("🔍 userId guardado para notificación:", userId);

    // 3. Crear la vacuna (CreateVaccineData SIN userId)
    const vaccineData = VaccineMapper.toDomain(dto);
    const vaccine = await this.vaccineRepository.addVaccine(vaccineData);

    // 4. ✅ PUBLICAR EN PUB/SUB - Usar userId del DTO (no vaccine.userId)
    console.log("📤 Publicando evento VACCINE_APPLIED...");
    console.log("👤 userId para notificación:", userId);
    
    try {
      await this.vaccinePublisher.publishVaccineApplied({
        vaccineId: vaccine.id,
        petId: vaccine.petId,
        userId: userId,  // ✅ USAR userId del DTO
        name: vaccine.nameValue,
        batch: vaccine.lotNumber || 'N/A',
        applicationDate: vaccine.applicationDate.toISOString(),
        nextDoseDate: vaccine.nextDoseDateValue?.toISOString() || '',
        veterinarian: vaccine.veterinarian || 'pending',
      });
      console.log("✅ Evento VACCINE_APPLIED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }

    return vaccine;
  }
}