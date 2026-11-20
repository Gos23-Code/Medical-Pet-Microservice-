import { withCorrections } from '@/src/infrastructure/clinical/act-versions';
// app/api/labTests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AddLabTestUseCase } from '@/src/application/use-cases/lab-test/add-lab-test.use-case';
import { SupabaseLabTestRepository } from '@/src/infrastructure/database/repositories/supabase-lab-test.repository';
import { GetLabTestsByVisitIdUseCase } from '@/src/application/use-cases/lab-test/get-lab-test.use-case';
import { CheckLabTestIsNormalUseCase } from '@/src/application/use-cases/lab-test/check-lab-test.use-case';
import { CreateLabTestDto } from '@/src/application/dtos/lab-test.dto';
import { createLabTestPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfVisit } from '@/src/infrastructure/database/pet-lookup';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { loadLabResults, replaceLabResults } from '@/src/infrastructure/database/repositories/supabase-lab-test-result.repository';
import { parseLabResults } from '@/src/application/clinical/lab-results';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { LAB_EXTRA_FIELDS, LAB_RESULT_FIELDS } from '@/src/application/clinical/clinical-specs';
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';

const repository = new SupabaseLabTestRepository();
const auditRepository = new SupabaseClinicalAuditRepository();

// ✅ Obtener instancia del publisher
const labTestPublisher = createLabTestPublisher();

const LAB_EXTRA_COLUMNS = Object.values(LAB_EXTRA_FIELDS).map((def) => def.column);

/** Agrega laboratorio, estado, interpretación y parámetros a cada examen de la lista. */
async function withLabDetails(items: unknown[]) {
  const ids = items.map((item) => String((item as { id: string }).id));
  const extras = await loadExtras('lab_tests', ids, LAB_EXTRA_COLUMNS);
  const results = await loadLabResults(ids);

  return items.map((item) => {
    const id = String((item as { id: string }).id);
    return {
      ...(item as object),
      ...toResponse(extras.get(id) ?? {}, LAB_EXTRA_FIELDS),
      results: results.get(id) ?? [],
    };
  });
}

// ============================================
// POST - Crear un nuevo laboratorio (solo clínica con CLINICAL_WRITE)
// Body: name, visit_id (obligatorios). Opcionales del mockup: laboratoryName, status,
// interpretation, results[{ parameter, result, unit, reference, flag }]. La mascota sale de la visita.
// ============================================
export const POST = withAuth(async (req: NextRequest, _context, actor) => {
  console.log('🚀 POST /api/lab');
  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  if (!body.visit_id) {
    return NextResponse.json({ error: 'visit_id es requerido' }, { status: 400 });
  }

  const parsedExtra = parseClinicExtras(!!actor.clinic, body, LAB_EXTRA_FIELDS);
  if (!parsedExtra.ok) {
    return NextResponse.json({ success: false, message: parsedExtra.message }, { status: 400 });
  }
  const parsedResults = actor.clinic ? parseLabResults(body.results) : { ok: true as const, rows: [] as Record<string, unknown>[] };
  if (!parsedResults.ok) {
    return NextResponse.json({ success: false, message: parsedResults.message }, { status: 400 });
  }

  const petId = await petIdOfVisit(body.visit_id);
  if (!petId) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'La visita no existe');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const dto: CreateLabTestDto = {
    name: body.name,
    result: body.result,
    normal_range: body.normal_range,
    date: body.date,
    notes: body.notes,
    visit_id: body.visit_id,
  };

  const useCase = new AddLabTestUseCase(repository);
  const result = await useCase.execute(dto);

  // Columnas nuevas: mascota, autoría, laboratorio externo, estado, interpretación
  await saveExtras('lab_tests', result.id, {
    ...parsedExtra.values,
    pet_id: petId,
    veterinary_id: authorship.veterinaryId,
    attended_by_employee_id: authorship.employeeId,
    created_by_user_id: actor.userId,
    source: authorship.source,
  });
  await replaceLabResults(result.id, parsedResults.rows);

  await auditRepository.record({
    tableName: 'lab_tests',
    recordId: result.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  const target = await resolveEventTarget(petId, authorship);
  if (target) {
    try {
      await labTestPublisher.publishLabTestCreated({
        labTestId: result.id,
        petId: petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        testType: body.name,
        results: body.result ? { result: body.result } : {},
        veterinarian: body.veterinarian || 'pending',
      });
      console.log('✅ Evento LAB_TEST_CREATED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json(
    {
      ...result,
      ...toResponse(parsedExtra.values, LAB_EXTRA_FIELDS),
      results: parsedResults.rows.map((row) => toResponse(row, LAB_RESULT_FIELDS)),
    },
    { status: 201 }
  );
});

// ============================================
// GET - Exámenes de una visita (dueño o clínica con CLINICAL_READ)
// ============================================
export const GET = withAuth(async (req: NextRequest, _context, actor) => {
  console.log('🚀 GET /api/labTests');
  const visit_id = req.nextUrl.searchParams.get('visit_id');
  const isNormal = req.nextUrl.searchParams.get('isNormal');

  if (!visit_id) {
    return NextResponse.json({ error: 'visit_id es requerido' }, { status: 400 });
  }

  const petId = await petIdOfVisit(visit_id);
  if (!petId) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'La visita no existe');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  if (isNormal === 'true') {
    const useCase = new CheckLabTestIsNormalUseCase(repository);
    const result = await useCase.execute(visit_id);
    return NextResponse.json(result, { status: 200 });
  }

  const useCase = new GetLabTestsByVisitIdUseCase(repository);
  const result = await useCase.execute(visit_id);
  const items = Array.isArray(result) ? await withLabDetails(result) : result;
  return NextResponse.json(await withCorrections('lab_tests', items), { status: 200 });
});

// PATCH ya no sobrescribe el resultado: la corrección es POST /api/lab/{id}/corrections (motivo obligatorio).
export const PATCH = overwriteRefused('/api/lab/{id}/corrections');
