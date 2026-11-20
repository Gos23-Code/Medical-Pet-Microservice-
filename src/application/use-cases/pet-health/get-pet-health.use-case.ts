import { PetHealthRepository, emptyClinicalProfile } from '@/src/domain/repositories/pet-health.repository';
import { effectiveAllergyStatus, PetAllergyStatus } from '@/src/application/clinical/pet-health/allergy-rules';
import { KindSummary, DewormingView, AllergyView, summarizeDewormings } from '@/src/application/clinical/pet-health/pet-health-view';
import { DewormingKind } from '@/src/application/clinical/pet-health/deworming-rules';
import { loadAllergyViews, loadDewormingViews } from './pet-health.shared';

export interface PetHealthView {
  petId: string;
  /** Lo que se muestra: HAS_ALLERGIES si hay alergias vigentes; si no, lo declarado. */
  allergyStatus: PetAllergyStatus;
  allergies: AllergyView[];
  neutered: {
    status: string;
    at: string | null;
    source: string | null;
    confirmedByEmployeeId: string | null;
    confirmedAt: string | null;
  };
  dewormings: Record<DewormingKind, KindSummary>;
  dewormingRecords: DewormingView[];
}

// Vista completa de los datos clínicos de la mascota. La usan GET de alergias, desparasitación y el resumen.
export class GetPetHealthUseCase {
  constructor(private readonly repository: PetHealthRepository) {}

  async execute(petId: string): Promise<PetHealthView> {
    const profile = (await this.repository.findProfile(petId)) ?? emptyClinicalProfile(petId);
    const allergies = await loadAllergyViews(this.repository, petId);
    const dewormingRecords = await loadDewormingViews(this.repository, petId);

    const activeCount = allergies.filter((a) => a.isActive).length;

    return {
      petId,
      allergyStatus: effectiveAllergyStatus(profile.allergyStatus, activeCount),
      allergies,
      neutered: {
        status: profile.neuteredStatus,
        at: profile.neuteredAt,
        source: profile.neuteredSource,
        confirmedByEmployeeId: profile.neuteredConfirmedEmployeeId,
        confirmedAt: profile.neuteredConfirmedAt,
      },
      dewormings: summarizeDewormings(dewormingRecords),
      dewormingRecords,
    };
  }
}
