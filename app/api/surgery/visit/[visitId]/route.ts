import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { loadExtras } from '@/src/infrastructure/database/clinical-extras';
import { toResponse } from '@/src/application/clinical/field-spec';
import { SURGERY_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { petIdOfVisit } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);

// GET /api/surgery/visit/[visitId]?petId=xxx&status=xxx&fromDate=xxx&toDate=xxx
// La mascota sale de la visita: el dueño o la clínica con CLINICAL_READ.
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ visitId: string }> }, actor) => {
  const { visitId } = await context.params;

  const petId = await petIdOfVisit(visitId);
  if (!petId) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'La visita no existe');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const includeStats = searchParams.get('stats') === 'true';

  const filters = {
    visitId: visitId,
    petId: undefined,
    status: status || undefined,
    fromDate: fromDate ? new Date(fromDate) : undefined,
    toDate: toDate ? new Date(toDate) : undefined,
  };

  if (includeStats) {
    const statistics = await getSurgeriesUseCase.getStatistics(filters);
    return NextResponse.json({ success: true, data: { statistics } });
  }

  const surgeries = await getSurgeriesUseCase.execute(filters);

  const extras = await loadExtras('pet_surgeries', surgeries.map((s) => s.id), Object.values(SURGERY_EXTRA_FIELDS).map((d) => d.column));
  return NextResponse.json({
    success: true,
    data: surgeries.map((s) => ({ ...s.toJSON(), ...toResponse(extras.get(s.id) ?? {}, SURGERY_EXTRA_FIELDS) })),
    count: surgeries.length,
  });
});
