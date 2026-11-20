import { PetHealthRepository } from '@/src/domain/repositories/pet-health.repository';
import { validateNewAllergy } from '@/src/application/clinical/pet-health/allergy-rules';
import { PetHealthAuditPort, PetHealthWriter } from './pet-health.shared';

// El dueño declara una alergia como SUSPECTED. Una clínica (con CLINICAL_WRITE) la registra ya CONFIRMED.
export class RegisterAllergyUseCase {
  constructor(
    private readonly repository: PetHealthRepository,
    private readonly audit: PetHealthAuditPort
  ) {}

  async execute(petId: string, writer: PetHealthWriter, body: Record<string, unknown>): Promise<{ id: string; status: string }> {
    const input = validateNewAllergy(body);
    const status = writer.source === 'CLINIC' ? 'CONFIRMED' : 'SUSPECTED';

    const id = await this.repository.insertAllergy({
      petId,
      ...input,
      status,
      source: writer.source,
      createdByUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
      employeeId: writer.employeeId,
    });

    await this.audit.record({
      tableName: 'pet_allergies',
      recordId: id,
      action: 'CREATE',
      actorUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
    });

    return { id, status };
  }
}
