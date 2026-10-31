import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { AddSurgeryUseCase } from '@/src/application/use-cases/surgery/add-surgery.use-case';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';
import { createSurgeryPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfVisit } from '@/src/infrastructure/database/pet-lookup';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { SURGERY_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';

const repository = new SupabasePetSurgeryRepository();
const addSurgeryUseCase = new AddSurgeryUseCase(repository);
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);
const auditRepository = new SupabaseClinicalAuditRepository();

// ✅ Obtener instancia del publisher
const surgeryPublisher = createSurgeryPublisher();

const SURGERY_EXTRA_COLUMNS = Object.values(SURGERY_EXTRA_FIELDS).map((def) => def.column);

// GET /api/surgery?visitId=xxx&petId=xxx&status=xxx&fromDate=xxx&toDate=xxx
// Dueño de la mascota o clínica con CLINICAL_READ. Con visitId, la mascota sale de la visita.
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get('visitId');
  const petIdParam = searchParams.get('petId');
  const status = searchParams.get('status');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const includeStats = searchParams.get('stats') === 'true';

  if (!visitId && !petIdParam) {
    return NextResponse.json(
      { error: 'At least one filter is required: visitId or petId' },
      { status: 400 }
    );
  }

  const petId = petIdParam ?? (await petIdOfVisit(visitId as string));
  if (!petId) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'La visita no existe');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const filters = {
    visitId: visitId || undefined,
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
  const extras = await loadExtras('pet_surgeries', surgeries.map((s) => s.id), SURGERY_EXTRA_COLUMNS);

  return NextResponse.json({
    success: true,
    data: surgeries.map((s: PetSurgery) => ({
      ...s.toJSON(),
      ...toResponse(extras.get(s.id) ?? {}, SURGERY_EXTRA_FIELDS),
    })),
    count: surgeries.length,
  });
});

// POST /api/surgery - Solo clínica con CLINICAL_WRITE. Body: petId, veterinaryVisitId, title,
// description, surgeryDate, durationMinutes (obligatorios); startsAt, asaRisk, anesthesiaUsed,
// postOpInstructions, veterinarian (opcionales). Sin userId.
export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  const body = await request.json();

  const requiredFields = ['petId', 'veterinaryVisitId', 'title', 'description', 'surgeryDate', 'durationMinutes'];
  const missingFields = requiredFields.filter((field) => !body[field]);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(', ')}` },
      { status: 400 }
    );
  }

  const parsed = parseClinicExtras(!!actor.clinic, body, SURGERY_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const authorship = await authorizePet(actor, body.petId, 'CLINICAL_WRITE');

  const surgery = await addSurgeryUseCase.execute({
    petId: body.petId,
    veterinaryVisitId: body.veterinaryVisitId,
    title: body.title,
    description: body.description,
    surgeryDate: new Date(body.surgeryDate),
    durationMinutes: body.durationMinutes,
    anesthesiaUsed: body.anesthesiaUsed,
    postOpInstructions: body.postOpInstructions,
  });

  // Columnas nuevas: hora de inicio, riesgo ASA y autoría (clínica y cirujano)
  await saveExtras('pet_surgeries', surgery.id, {
    ...parsed.values,
    source: authorship.source,
    veterinary_id: authorship.veterinaryId,
    surgeon_employee_id: authorship.employeeId,
  });

  await auditRepository.record({
    tableName: 'pet_surgeries',
    recordId: surgery.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  const target = await resolveEventTarget(body.petId, authorship);
  if (target) {
    try {
      await surgeryPublisher.publishSurgeryScheduled({
        surgeryId: surgery.id,
        petId: body.petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        type: body.title,
        scheduledDate: body.surgeryDate,
        veterinarian: body.veterinarian || 'pending',
      });
      console.log('✅ Evento SURGERY_SCHEDULED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json({
    success: true,
    data: { ...surgery.toJSON(), ...toResponse(parsed.values, SURGERY_EXTRA_FIELDS) },
    message: 'Surgery created successfully',
  }, { status: 201 });
});
