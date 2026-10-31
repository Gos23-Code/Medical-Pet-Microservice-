// src/app/api/pet-surgery/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { UpdateSurgeryUseCase } from '@/src/application/use-cases/surgery/update-surgery.use-case';
import { DeleteSurgeryUseCase } from '@/src/application/use-cases/surgery/delete-surgery.use-case';
import { createSurgeryPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository, buildChanges } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { petIdOfSurgery } from '@/src/infrastructure/database/pet-lookup';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { ForbiddenError, NotFoundError } from '@/src/infrastructure/http/api-error';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { SURGERY_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);
const updateSurgeryUseCase = new UpdateSurgeryUseCase(repository);
const deleteSurgeryUseCase = new DeleteSurgeryUseCase(repository);
const auditRepository = new SupabaseClinicalAuditRepository();

// ✅ Obtener instancia del publisher
const surgeryPublisher = createSurgeryPublisher();

type RouteContext = { params: Promise<{ id: string }> };

const SURGERY_EXTRA_COLUMNS = Object.values(SURGERY_EXTRA_FIELDS).map((def) => def.column);

async function surgeryWithExtras(id: string, dto: object) {
  const extras = await loadExtras('pet_surgeries', [id], SURGERY_EXTRA_COLUMNS);
  return { ...dto, ...toResponse(extras.get(id) ?? {}, SURGERY_EXTRA_FIELDS) };
}

// GET /api/surgery/[id] - dueño o clínica con CLINICAL_READ
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const petId = await petIdOfSurgery(id);
  if (!petId) {
    throw new NotFoundError('SURGERY_NOT_FOUND', 'Surgery not found');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const surgery = await getSurgeriesUseCase.getById(id);
  return NextResponse.json({ success: true, data: await surgeryWithExtras(id, surgery.toJSON()) });
});

// PUT /api/surgery/[id] - Solo clínica con CLINICAL_WRITE
export const PUT = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const petId = await petIdOfSurgery(id);
  if (!petId) {
    return NextResponse.json({ error: 'Surgery not found' }, { status: 404 });
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body = await request.json();
  const parsed = parseClinicExtras(!!actor.clinic, body, SURGERY_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const currentSurgery = await getSurgeriesUseCase.getById(id);

  const surgery = await updateSurgeryUseCase.execute({
    id: id,
    title: body.title,
    description: body.description,
    surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : undefined,
    durationMinutes: body.durationMinutes,
    anesthesiaUsed: body.anesthesiaUsed,
    complications: body.complications,
    postOpInstructions: body.postOpInstructions,
    outcome: body.outcome,
    status: body.status,
    nextCheckupDate: body.nextCheckupDate ? new Date(body.nextCheckupDate) : undefined,
  });

  await saveExtras('pet_surgeries', id, parsed.values);

  await auditRepository.record({
    tableName: 'pet_surgeries',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges(
      { status: currentSurgery.status, description: currentSurgery.description },
      { status: body.status, description: body.description }
    ),
  });

  // Si el estado cambió a 'completed', avisar al dueño
  if (body.status?.toLowerCase() === 'completed') {
    const target = await resolveEventTarget(petId, authorship);
    if (target) {
      try {
        await surgeryPublisher.publishSurgeryCompleted({
          surgeryId: id,
          petId: petId,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          outcome: body.outcome || 'completed successfully',
          notes: body.postOpInstructions || body.description || '',
          completedAt: new Date().toISOString(),
        });
        console.log('✅ Evento SURGERY_COMPLETED publicado correctamente');
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: await surgeryWithExtras(id, surgery.toJSON()),
    message: 'Surgery updated successfully',
  });
});

// PATCH /api/surgery/[id] - Actualizar solo el estado. Solo clínica con CLINICAL_WRITE
export const PATCH = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const petId = await petIdOfSurgery(id);
  if (!petId) {
    return NextResponse.json({ error: 'Surgery not found' }, { status: 404 });
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body = await request.json();

  if (!body.status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const currentSurgery = await getSurgeriesUseCase.getById(id);

  const surgery = await updateSurgeryUseCase.updateStatus({
    id: id,
    status: body.status,
    outcome: body.outcome,
  });

  await auditRepository.record({
    tableName: 'pet_surgeries',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges({ status: currentSurgery.status }, { status: body.status }),
  });

  if (body.status === 'completed') {
    const target = await resolveEventTarget(petId, authorship);
    if (target) {
      try {
        await surgeryPublisher.publishSurgeryCompleted({
          surgeryId: id,
          petId: petId,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          outcome: body.outcome || 'completed successfully',
          notes: currentSurgery.description || '',
          completedAt: new Date().toISOString(),
        });
        console.log('✅ Evento SURGERY_COMPLETED publicado correctamente');
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: await surgeryWithExtras(id, surgery.toJSON()),
    message: 'Surgery status updated successfully',
  });
});

// DELETE /api/surgery/[id] - Solo clínica con CLINICAL_WRITE y la MISMA clínica que la creó (MED-03)
export const DELETE = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const { data: row } = await createClient()
    .from('pet_surgeries')
    .select('pet_id, veterinary_id')
    .eq('id', id)
    .maybeSingle();

  if (!row) {
    throw new NotFoundError('SURGERY_NOT_FOUND', 'Surgery not found');
  }

  const authorship = await authorizePet(actor, row.pet_id, 'CLINICAL_WRITE');

  if (row.veterinary_id !== authorship.veterinaryId) {
    throw new ForbiddenError('TENANT_MISMATCH', 'Solo la clínica que registró la cirugía puede borrarla');
  }

  await deleteSurgeryUseCase.execute(id);

  await auditRepository.record({
    tableName: 'pet_surgeries',
    recordId: id,
    action: 'DELETE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  return NextResponse.json({ success: true, message: 'Surgery deleted successfully' });
});
