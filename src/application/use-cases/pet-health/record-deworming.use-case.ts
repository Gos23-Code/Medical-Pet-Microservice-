import { PetHealthRepository } from '@/src/domain/repositories/pet-health.repository';
import { validateDeworming } from '@/src/application/clinical/pet-health/deworming-rules';
import { PetHealthAuditPort, PetHealthWriter } from './pet-health.shared';

// Dueño (OWNER) o clínica con NURSING_WRITE registran la fecha de una dosis aplicada.
export class RecordDewormingUseCase {
  constructor(
    private readonly repository: PetHealthRepository,
    private readonly audit: PetHealthAuditPort
  ) {}

  async execute(petId: string, writer: PetHealthWriter, body: Record<string, unknown>, today: string): Promise<{ id: string }> {
    const input = validateDeworming(body, today);

    const id = await this.repository.insertDeworming({
      petId,
      ...input,
      source: writer.source,
      createdByUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
      employeeId: writer.employeeId,
    });

    await this.audit.record({
      tableName: 'pet_dewormings',
      recordId: id,
      action: 'CREATE',
      actorUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
    });

    return { id };
  }
}
