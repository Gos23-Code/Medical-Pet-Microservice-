import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { IsActiveUseCase } from '@/src/application/use-cases/treatments/is-active.use-case';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { petIdOfTreatment } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const repository = new SupabaseTreatmentRepository();
const isActiveUseCase = new IsActiveUseCase(repository);

// GET /api/treatments/[id]/is-active - dueño o clínica con CLINICAL_READ
export const GET = withAuth(async (_request: NextRequest, context: { params: Promise<{ id: string }> }, actor) => {
  const { id } = await context.params;
  console.log(`📝 GET /api/treatments/${id}/is-active - Verificando si está activo`);

  const petId = await petIdOfTreatment(id);
  if (!petId) {
    throw new NotFoundError('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const result = await isActiveUseCase.execute(id);

  return NextResponse.json({
    success: true,
    data: {
      treatmentId: id,
      isActive: result.isActive,
      status: result.status,
      message: result.message,
      checkedAt: new Date().toISOString(),
    },
  });
});
