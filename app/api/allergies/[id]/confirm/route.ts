import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { petIdOfAllergy } from '@/src/infrastructure/database/pet-lookup';
import { ConfirmAllergyUseCase } from '@/src/application/use-cases/pet-health/confirm-allergy.use-case';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import {
  auditRepository,
  correctionRepository,
  petHealthRepository,
  toWriter,
} from '@/src/infrastructure/clinical/pet-health-http';

// POST /api/allergies/[id]/confirm → una clínica con CLINICAL_WRITE confirma una alergia declarada por el dueño.
// El dueño recibe 403 (OWNER_CANNOT_CONFIRM). Motivo opcional en el body: { "reason": "..." }.
export const POST = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, actor) => {
  const { id } = await context.params;

  const petId = await petIdOfAllergy(id);
  if (!petId) {
    throw new NotFoundError('ALLERGY_NOT_FOUND', 'La alergia no existe');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const useCase = new ConfirmAllergyUseCase(petHealthRepository(), correctionRepository(), auditRepository());
  const result = await useCase.execute(id, toWriter(authorship), typeof body.reason === 'string' ? body.reason : undefined);

  return NextResponse.json({ ...result, allergyId: id }, { status: 201 });
});
