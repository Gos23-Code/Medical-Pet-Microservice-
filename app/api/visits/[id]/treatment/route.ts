import { NextRequest, NextResponse } from 'next/server';
import { GetTreatmentsByVisitUseCase } from '@/src/application/use-cases/visits/get-treatment.use-case';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const getTreatmentsByVisitUseCase = new GetTreatmentsByVisitUseCase();

// GET /api/visits/[id]/treatment - La mascota de la visita decide la autorización
export const GET = withAuth(async (_request: NextRequest, context: { params: Promise<{ id: string }> }, actor) => {
  const { id } = await context.params;
  console.log(`📝 GET /api/visits/${id}/treatment - Obteniendo tratamientos de la visita`);

  const { data: visit } = await createClient()
    .from('veterinary_visits')
    .select('pet_id')
    .eq('id', id)
    .maybeSingle();

  if (!visit) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'Visita no encontrada');
  }

  await authorizePet(actor, visit.pet_id, 'CLINICAL_READ');

  const treatments = await getTreatmentsByVisitUseCase.execute(id);

  return NextResponse.json({
    success: true,
    data: treatments,
    count: treatments.length,
  });
});
