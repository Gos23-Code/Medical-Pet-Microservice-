// app/api/vaccines/[id]/due/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { CheckVaccineDueUseCase } from '@/src/application/use-cases/vaccine/check-vaccine.use-case';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { petIdOfVaccine } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const vaccineRepository = new VaccineRepository();

// GET /api/vaccines/{id}/due - Verificar si está vencida (dueño o clínica con CLINICAL_READ_BASIC)
export const GET = withAuth(async (_request: NextRequest, context: { params: Promise<{ id: string }> }, actor) => {
  const { id } = await context.params;

  const petId = await petIdOfVaccine(id);
  if (!petId) {
    throw new NotFoundError('VACCINE_NOT_FOUND', 'Vacuna no encontrada');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ_BASIC');

  const result = await new CheckVaccineDueUseCase(vaccineRepository).execute(id);

  return NextResponse.json({
    id: result.id,
    name: result.name,
    isDue: result.isDue,
    daysUntilDue: result.daysUntilDue,
    nextDoseDate: result.nextDoseDate,
    applicationDate: result.applicationDate,
  });
});
