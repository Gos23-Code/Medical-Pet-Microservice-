import { PetHealthRepository } from '@/src/domain/repositories/pet-health.repository';
import { ClinicalCorrectionRepository } from '@/src/domain/repositories/clinical-correction.repository';
import { assertCanConfirm } from '@/src/application/clinical/act-integrity';
import { groupVersions } from '@/src/application/clinical/pet-health/pet-health-view';
import { currentValues } from '@/src/application/clinical/pet-health/current-version';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { PetHealthAuditPort, PetHealthWriter } from './pet-health.shared';

const DEFAULT_REASON = 'Alergia confirmada por la veterinaria';

// Una clínica confirma una alergia que declaró el dueño. Es una versión (autor, fecha, motivo), no una sobrescritura.
export class ConfirmAllergyUseCase {
  constructor(
    private readonly repository: PetHealthRepository,
    private readonly corrections: ClinicalCorrectionRepository,
    private readonly audit: PetHealthAuditPort
  ) {}

  async execute(allergyId: string, writer: PetHealthWriter, reason?: string): Promise<{ version: number }> {
    const row = await this.repository.findAllergyById(allergyId);
    if (!row) {
      throw new NotFoundError('ALLERGY_NOT_FOUND', 'La alergia no existe');
    }

    const versions = groupVersions(await this.repository.listVersions('pet_allergies', [allergyId])).get(allergyId) ?? [];
    const currentStatus = String(currentValues({ status: row.status }, versions).status);

    assertCanConfirm(
      { userId: writer.userId, veterinaryId: writer.veterinaryId },
      { source: row.source, currentStatus }
    );

    const version = await this.corrections.applyCorrection({
      table: 'pet_allergies',
      recordId: allergyId,
      reason: reason?.trim() || DEFAULT_REASON,
      values: { status: 'CONFIRMED' },
      authorUserId: writer.userId,
      authorEmployeeId: writer.employeeId,
      veterinaryId: writer.veterinaryId,
      authorRole: 'CLINIC',
    });

    await this.audit.record({
      tableName: 'pet_allergies',
      recordId: allergyId,
      action: 'UPDATE',
      actorUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
      changes: { status: { from: currentStatus, to: 'CONFIRMED' } },
    });

    return { version };
  }
}
