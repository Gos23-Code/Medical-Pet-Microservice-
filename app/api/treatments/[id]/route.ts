// app/api/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { GetTreatmentUseCase } from '@/src/application/use-cases/treatments/get-treatment.use-case';
import { UpdateTreatmentUseCase } from '@/src/application/use-cases/treatments/update-treatment.use-case';
import { IsActiveUseCase } from '@/src/application/use-cases/treatments/is-active.use-case';
import { TreatmentMapper } from '@/src/application/mappers/treatment.mapper';
import { UpdateTreatmentDTO } from '@/src/application/dtos/treatment.dto';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { Medication } from '@/src/domain/repositories/treatment.repository';
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import {
  SupabaseClinicalAuditRepository,
  buildChanges,
} from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfTreatment } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { TREATMENT_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';

const repository = new SupabaseTreatmentRepository();
const getTreatmentUseCase = new GetTreatmentUseCase(repository);
const updateTreatmentUseCase = new UpdateTreatmentUseCase(repository);
const isActiveUseCase = new IsActiveUseCase(repository);
const auditRepository = new SupabaseClinicalAuditRepository();

const TREATMENT_EXTRA_COLUMNS = Object.values(TREATMENT_EXTRA_FIELDS).map((def) => def.column);

// Columnas del mockup (estado, indicaciones, suspensión) que no maneja el caso de uso original.
async function treatmentExtrasFor(id: string) {
  const extras = await loadExtras('treatments', [id], TREATMENT_EXTRA_COLUMNS);
  return toResponse(extras.get(id) ?? {}, TREATMENT_EXTRA_FIELDS);
}

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/treatments/[id] - Tratamiento completo con medicamentos (dueño o clínica con CLINICAL_READ)
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log(`📝 GET /api/treatments/${id} - Obteniendo tratamiento con medicamentos`);

  const petId = await petIdOfTreatment(id);
  if (!petId) {
    throw new NotFoundError('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const result = await getTreatmentUseCase.execute(id, true);

  let treatment: Treatment;
  let medications: Medication[] = [];

  if ('treatment' in result && 'medications' in result) {
    treatment = result.treatment;
    medications = result.medications;
  } else {
    treatment = result as Treatment;
  }

  const medicationsForDTO = medications.map((med) => ({
    id: med.id,
    treatmentId: med.treatmentId,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    createdAt: med.createdAt.toISOString(),
    updatedAt: med.updatedAt.toISOString(),
  }));

  const activeStatus = await isActiveUseCase.execute(id);
  const dto = TreatmentMapper.toDTO(treatment, medicationsForDTO);

  return NextResponse.json({
    success: true,
    data: {
      ...dto,
      ...(await treatmentExtrasFor(id)),
      isActive: activeStatus.isActive,
      activeStatus: {
        status: activeStatus.status,
        message: activeStatus.message,
      },
    },
  });
});

// PUT /api/treatments/[id] - Actualizar tratamiento (fechas y notas). Solo clínica con CLINICAL_WRITE.
export const PUT = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log(`📝 PUT /api/treatments/${id} - Actualizando tratamiento`);

  const petId = await petIdOfTreatment(id);
  if (!petId) {
    throw new NotFoundError('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body: UpdateTreatmentDTO = await request.json();

  const parsed = parseClinicExtras(!!actor.clinic, body as unknown as Record<string, unknown>, TREATMENT_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  // 1. Obtener el tratamiento actual para comparar cambios
  const currentResult = await getTreatmentUseCase.execute(id, false);
  const currentTreatment = currentResult as Treatment;

  // 2. Detectar cambios
  const hasEndDateAdded = body.endDate && !currentTreatment.endDate;
  const hasNotesChanged = body.notes !== undefined && body.notes !== currentTreatment.notes;
  const hasStartDateChanged = body.startDate !== undefined && body.startDate !== currentTreatment.startDate.toISOString().split('T')[0];
  const hasEndDateChanged = body.endDate !== undefined && body.endDate !== (currentTreatment.endDate?.toISOString().split('T')[0] || null);

  // 3. Actualizar el tratamiento
  await updateTreatmentUseCase.execute(id, {
    userId: actor.userId,
    petId: petId,
    startDate: body.startDate,
    endDate: body.endDate,
    notes: body.notes,
  });

  await auditRepository.record({
    tableName: 'treatments',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges(
      {
        start_date: currentTreatment.startDate.toISOString().split('T')[0],
        end_date: currentTreatment.endDate?.toISOString().split('T')[0] ?? null,
        notes: currentTreatment.notes ?? null,
      },
      {
        start_date: body.startDate,
        end_date: body.endDate,
        notes: body.notes,
      }
    ),
  });

  await saveExtras('treatments', id, parsed.values);

  // 4. Obtener el tratamiento actualizado
  const result = await getTreatmentUseCase.execute(id, true);

  let treatment: Treatment;
  let medications: Medication[] = [];

  if ('treatment' in result && 'medications' in result) {
    treatment = result.treatment;
    medications = result.medications;
  } else {
    treatment = result as Treatment;
  }

  // 5. Obtener estado activo con progreso
  const activeStatus = await isActiveUseCase.execute(id);

  // 6. ✅ NOTIFICACIONES (destinatario = dueño de la mascota, resuelto en Pets)
  const target = await resolveEventTarget(petId, authorship);
  let notificationSent = false;

  if (target) {
    // 6a. Si se agregó endDate manualmente (tratamiento completado)
    if (hasEndDateAdded) {
      try {
        await treatmentsPublisher.publishTreatmentCompleted({
          treatmentId: id,
          petId: petId,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          outcome: 'completed',
          completedAt: new Date().toISOString(),
        });
        notificationSent = true;
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }

    // 6b. Si el progreso llegó al 100% (ACTIVE_LAST_DAY o EXPIRED)
    if (!notificationSent && activeStatus.progress === 100) {
      const outcome = activeStatus.status === 'EXPIRED' ? 'expired' : 'completed';
      try {
        await treatmentsPublisher.publishTreatmentCompleted({
          treatmentId: id,
          petId: petId,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          outcome: outcome,
          completedAt: new Date().toISOString(),
        });
        notificationSent = true;
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }

    // 6c. Si se actualizaron notas (evolución del tratamiento) y no se envió notificación antes
    if (hasNotesChanged && !notificationSent) {
      try {
        await treatmentsPublisher.publishTreatmentUpdated({
          treatmentId: id,
          petId: petId,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          progress: activeStatus.progress || 0,
          status: activeStatus.status || 'in_progress',
          updatedAt: new Date().toISOString(),
        });
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }
  }

  // 7. Si solo se actualizaron fechas (sin notas), no se envía notificación: el progreso se recalcula solo
  if ((hasStartDateChanged || hasEndDateChanged) && !hasNotesChanged && !hasEndDateAdded && activeStatus.progress !== 100) {
    console.log('ℹ️ Solo se actualizaron fechas - sin notificación (el progreso se recalcula automáticamente)');
  }

  const medicationsForDTO = medications.map((med) => ({
    id: med.id,
    treatmentId: med.treatmentId,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    createdAt: med.createdAt.toISOString(),
    updatedAt: med.updatedAt.toISOString(),
  }));

  const dto = TreatmentMapper.toDTO(treatment, medicationsForDTO);

  return NextResponse.json({
    success: true,
    message: 'Tratamiento actualizado exitosamente',
    data: {
      ...dto,
      ...(await treatmentExtrasFor(id)),
      isActive: activeStatus.isActive,
      activeStatus: {
        status: activeStatus.status,
        message: activeStatus.message,
      },
    },
  });
});
