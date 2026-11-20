import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { GetPetHealthUseCase } from '@/src/application/use-cases/pet-health/get-pet-health.use-case';
import { UpdatePetClinicalProfileUseCase } from '@/src/application/use-cases/pet-health/update-pet-clinical-profile.use-case';
import { todayInTimeZone } from '@/src/shared/business-date';
import { petBirthDate } from '@/src/infrastructure/clinical/pet-birth-date';
import {
  auditRepository,
  petHealthRepository,
  readJsonBody,
  toWriter,
} from '@/src/infrastructure/clinical/pet-health-http';

// GET /api/pets/[petId]/clinical-profile → alergias (estado general) y esterilización.
// PUT /api/pets/[petId]/clinical-profile → cambia allergyStatus (UNKNOWN | NONE_KNOWN) y/o neuteredStatus / neuteredAt.
//   allergyStatus exige CLINICAL_WRITE para la clínica; neuteredStatus exige NURSING_WRITE. El dueño puede todo.
export const GET = withAuth(async (_request: NextRequest, context: { params: Promise<{ petId: string }> }, actor) => {
  const { petId } = await context.params;
  await authorizePet(actor, petId, 'CLINICAL_READ_BASIC');

  const health = await new GetPetHealthUseCase(petHealthRepository()).execute(petId);
  return NextResponse.json(
    { petId, allergyStatus: health.allergyStatus, neutered: health.neutered },
    { status: 200 }
  );
});

export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ petId: string }> }, actor) => {
  const { petId } = await context.params;
  const body = await readJsonBody(request);

  const need = body.allergyStatus !== undefined ? 'CLINICAL_WRITE' : 'NURSING_WRITE';
  const authorship = await authorizePet(actor, petId, need);

  const useCase = new UpdatePetClinicalProfileUseCase(petHealthRepository(), auditRepository());
  await useCase.execute(petId, toWriter(authorship), body, todayInTimeZone(), await petBirthDate(petId));

  const health = await new GetPetHealthUseCase(petHealthRepository()).execute(petId);
  return NextResponse.json({ petId, allergyStatus: health.allergyStatus, neutered: health.neutered }, { status: 200 });
});
