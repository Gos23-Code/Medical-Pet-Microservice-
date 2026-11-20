import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { GetPetHealthUseCase } from '@/src/application/use-cases/pet-health/get-pet-health.use-case';
import { RecordDewormingUseCase } from '@/src/application/use-cases/pet-health/record-deworming.use-case';
import { todayInTimeZone } from '@/src/shared/business-date';
import {
  auditRepository,
  petHealthRepository,
  readJsonBody,
  requireQueryParam,
  toWriter,
} from '@/src/infrastructure/clinical/pet-health-http';

// GET  /api/dewormings?petId=  → última dosis por tipo (interna y externa) y lista de dosis (dueño o clínica con CLINICAL_READ_BASIC)
// POST /api/dewormings         → registra la fecha de una dosis aplicada (dueño o clínica con NURSING_WRITE).
//   No hay próxima dosis: el intervalo depende del producto y no se calcula aquí.
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  const petId = requireQueryParam(request, 'petId');
  await authorizePet(actor, petId, 'CLINICAL_READ_BASIC');

  const health = await new GetPetHealthUseCase(petHealthRepository()).execute(petId);
  return NextResponse.json({ petId, dewormings: health.dewormings, items: health.dewormingRecords }, { status: 200 });
});

export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  const body = await readJsonBody(request);
  const petId = typeof body.petId === 'string' ? body.petId : '';
  if (!petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }

  const authorship = await authorizePet(actor, petId, 'NURSING_WRITE');
  const useCase = new RecordDewormingUseCase(petHealthRepository(), auditRepository());
  const result = await useCase.execute(petId, toWriter(authorship), body, todayInTimeZone());

  return NextResponse.json(result, { status: 201 });
});
