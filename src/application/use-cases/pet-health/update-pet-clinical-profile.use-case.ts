import { PetClinicalProfile, PetHealthRepository, emptyClinicalProfile } from '@/src/domain/repositories/pet-health.repository';
import { ApiError } from '@/src/infrastructure/http/api-error';
import { effectiveAllergyStatus, validateStoredAllergyStatus } from '@/src/application/clinical/pet-health/allergy-rules';
import { validateNeutering } from '@/src/application/clinical/pet-health/neutering-rules';
import { PetHealthAuditPort, PetHealthWriter, loadAllergyViews } from './pet-health.shared';

export interface ClinicalProfileBody {
  allergyStatus?: unknown;
  neuteredStatus?: unknown;
  neuteredAt?: unknown;
}

// Estado de la mascota (alergias sin preguntar/ninguna, esterilización). Es estado, no acto:
// se actualiza la fila con autor y fecha, y cada cambio queda en la auditoría.
export class UpdatePetClinicalProfileUseCase {
  constructor(
    private readonly repository: PetHealthRepository,
    private readonly audit: PetHealthAuditPort
  ) {}

  async execute(
    petId: string,
    writer: PetHealthWriter,
    body: ClinicalProfileBody,
    today: string,
    birthDate: string | null = null
  ): Promise<PetClinicalProfile> {
    const touchesAllergy = body.allergyStatus !== undefined;
    const touchesNeutered = body.neuteredStatus !== undefined || body.neuteredAt !== undefined;
    if (!touchesAllergy && !touchesNeutered) {
      throw new ApiError(400, 'NOTHING_TO_UPDATE', 'Envía allergyStatus, neuteredStatus o neuteredAt');
    }

    const current = (await this.repository.findProfile(petId)) ?? emptyClinicalProfile(petId);
    const next: PetClinicalProfile = { ...current };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const now = new Date().toISOString();

    if (touchesAllergy) {
      const allergyStatus = validateStoredAllergyStatus(body.allergyStatus);
      if (allergyStatus === 'NONE_KNOWN') {
        const active = (await loadAllergyViews(this.repository, petId)).filter((a) => a.isActive);
        if (effectiveAllergyStatus('NONE_KNOWN', active.length) === 'HAS_ALLERGIES') {
          throw new ApiError(409, 'ACTIVE_ALLERGIES_EXIST', 'Hay alergias vigentes: no se puede declarar que no tiene alergias conocidas');
        }
      }
      changes.allergyStatus = { from: current.allergyStatus, to: allergyStatus };
      next.allergyStatus = allergyStatus;
      next.allergyStatusSource = writer.source;
      next.allergyStatusUserId = writer.userId;
      next.allergyStatusVeterinaryId = writer.veterinaryId;
    }

    if (touchesNeutered) {
      const neutering = validateNeutering(body.neuteredStatus, body.neuteredAt, today, birthDate);
      changes.neuteredStatus = { from: current.neuteredStatus, to: neutering.status };
      next.neuteredStatus = neutering.status;
      next.neuteredAt = neutering.at;
      next.neuteredSource = writer.source;
      next.neuteredUserId = writer.userId;
      next.neuteredVeterinaryId = writer.veterinaryId;
      // La clínica verifica el dato al escribirlo. Si el dueño lo cambia, la confirmación anterior deja de valer.
      next.neuteredConfirmedEmployeeId = writer.source === 'CLINIC' ? writer.employeeId : null;
      next.neuteredConfirmedAt = writer.source === 'CLINIC' ? now : null;
    }

    await this.repository.saveProfile(next);

    await this.audit.record({
      tableName: 'pet_clinical_profile',
      recordId: petId,
      action: 'UPDATE',
      actorUserId: writer.userId,
      veterinaryId: writer.veterinaryId,
      changes,
    });

    return next;
  }
}
