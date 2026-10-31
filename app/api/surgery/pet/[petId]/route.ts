// src/app/api/pet-surgery/pet/[petId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { loadExtras } from '@/src/infrastructure/database/clinical-extras';
import { toResponse } from '@/src/application/clinical/field-spec';
import { SURGERY_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);

// GET /api/surgery/pet/[petId]?status=xxx&fromDate=xxx&toDate=xxx
// Dueño de la mascota o clínica con CLINICAL_READ.
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ petId: string }> }, actor) => {
  const { petId } = await context.params;
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const includeStats = searchParams.get('stats') === 'true';

  const filters = {
    petId: petId,
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
