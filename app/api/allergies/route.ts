import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { GetPetHealthUseCase } from '@/src/application/use-cases/pet-health/get-pet-health.use-case';
import { RegisterAllergyUseCase } from '@/src/application/use-cases/pet-health/register-allergy.use-case';
import { todayInTimeZone } from '@/src/shared/business-date';
import {
  auditRepository,
  petHealthRepository,
  readJsonBody,
  requireQueryParam,
  toWriter,
} from '@/src/infrastructure/clinical/pet-health-http';

// GET  /api/allergies?petId=  → estado general y alergias (dueño, o clínica con CLINICAL_READ_BASIC)
// POST /api/allergies         → registra una alergia. Dueño: SUSPECTED. Clínica (CLINICAL_WRITE): CONFIRMED.
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  const petId = requireQueryParam(request, 'petId');
  await authorizePet(actor, petId, 'CLINICAL_READ_BASIC');

  const health = await new GetPetHealthUseCase(petHealthRepository()).execute(petId);
  return NextResponse.json({ petId, allergyStatus: health.allergyStatus, allergies: health.allergies }, { status: 200 });
});

export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  const body = await readJsonBody(request);
  const petId = typeof body.petId === 'string' ? body.petId : '';
  if (!petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }

  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');
  const useCase = new RegisterAllergyUseCase(petHealthRepository(), auditRepository());
  const result = await useCase.execute(petId, toWriter(authorship), body);

  return NextResponse.json(result, { status: 201 });
});
