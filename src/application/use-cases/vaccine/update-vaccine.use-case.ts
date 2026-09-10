import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { VaccinePublisher } from '@/src/infrastructure/pubsub/publishers/vaccine.publisher';

export class UpdateVaccineUseCase {
  constructor(
    private readonly vaccineRepository: IVaccineRepository,
    private readonly vaccinePublisher: VaccinePublisher,
  ) {}

  async execute(data: {
    id: string;
    userId: string;
    petId?: string;
    name?: string;
    lotNumber?: string | null;
    applicationDate?: Date;
    nextDoseDate?: Date | null;
    veterinarian?: string | null;
    notes?: string | null;
    status?: string;
  }): Promise<Vaccine> {
    // ✅ Validar userId
    if (!data.userId) {
      throw new Error('userId es requerido para notificaciones');
    }

    // 1. Obtener la vacuna actual
    const currentVaccine = await this.vaccineRepository.getById(data.id);
    if (!currentVaccine) {
      throw new Error('Vacuna no encontrada');
    }

    // 2. Guardar estado anterior
    const oldStatus = currentVaccine.status;

    // 3. Preparar datos de actualización y detectar cambios
    const updateData: {
      petId?: string;
      name?: string;
      lotNumber?: string | null;
      applicationDate?: Date;
      nextDoseDate?: Date | null;
      veterinarian?: string | null;
      notes?: string | null;
      status?: string;
    } = {};

    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // ✅ Detectar y guardar cambios
    if (data.petId !== undefined && data.petId !== currentVaccine.petId) {
      updateData.petId = data.petId;
      changes.petId = { old: currentVaccine.petId, new: data.petId };
    }

    if (data.name !== undefined && data.name !== currentVaccine.nameValue) {
      updateData.name = data.name;
      changes.name = { old: currentVaccine.nameValue, new: data.name };
    }

    if (data.lotNumber !== undefined && data.lotNumber !== currentVaccine.lotNumber) {
      updateData.lotNumber = data.lotNumber;
      changes.lotNumber = { old: currentVaccine.lotNumber, new: data.lotNumber };
    }

    if (data.applicationDate !== undefined) {
      const oldDate = currentVaccine.applicationDate.toISOString().split('T')[0];
      const newDate = data.applicationDate.toISOString().split('T')[0];
      if (oldDate !== newDate) {
        updateData.applicationDate = data.applicationDate;
        changes.applicationDate = { old: oldDate, new: newDate };
      }
    }

    if (data.nextDoseDate !== undefined) {
      const oldNext = currentVaccine.nextDoseDateValue?.toISOString().split('T')[0] || null;
      const newNext = data.nextDoseDate?.toISOString().split('T')[0] || null;
      if (oldNext !== newNext) {
        updateData.nextDoseDate = data.nextDoseDate;
        changes.nextDoseDate = { old: oldNext, new: newNext };
      }
    }

    if (data.veterinarian !== undefined && data.veterinarian !== currentVaccine.veterinarian) {
      updateData.veterinarian = data.veterinarian;
      changes.veterinarian = { old: currentVaccine.veterinarian, new: data.veterinarian };
    }

    if (data.notes !== undefined && data.notes !== currentVaccine.notes) {
      updateData.notes = data.notes;
      changes.notes = { old: currentVaccine.notes, new: data.notes };
    }

    if (data.status !== undefined && data.status !== currentVaccine.status) {
      updateData.status = data.status;
      changes.status = { old: currentVaccine.status, new: data.status };
    }

    // 4. Si no hay cambios, no hacer nada
    if (Object.keys(updateData).length === 0) {
      console.log(`ℹ️ No hay cambios para la vacuna ${data.id}`);
      return currentVaccine;
    }

    // 5. Actualizar la vacuna
    const vaccine = await this.vaccineRepository.updateVaccine(data.id, updateData);

    // 6. ✅ PUBLICAR NOTIFICACIÓN - VACCINE_UPDATED (en lugar de VACCINE_APPLIED)
    console.log("📤 Publicando evento VACCINE_UPDATED...");
    try {
      await this.vaccinePublisher.publishVaccineUpdated({
        vaccineId: vaccine.id,
        petId: vaccine.petId,
        userId: data.userId,
        name: vaccine.nameValue,
        oldStatus: oldStatus,
        newStatus: vaccine.status,
        changes: changes,
        updatedAt: new Date().toISOString(),
      });
      console.log("✅ Evento VACCINE_UPDATED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }

    return vaccine;
  }
}