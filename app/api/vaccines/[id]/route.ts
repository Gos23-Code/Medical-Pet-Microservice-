// app/api/vaccines/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { UpdateVaccineUseCase } from '@/src/application/use-cases/vaccine/update-vaccine.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import {
  SupabaseClinicalAuditRepository,
  buildChanges,
} from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfVaccine } from '@/src/infrastructure/database/pet-lookup';
import { saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { ConflictError, NotFoundError, ServiceUnavailableError } from '@/src/infrastructure/http/api-error';

const vaccineRepository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();
const auditRepository = new SupabaseClinicalAuditRepository();

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/vaccines/{id} - Solo la clínica con NURSING_WRITE. Sin userId en el body.
export const PUT = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log('📥 ID recibido en PUT:', id);

  const petId = await petIdOfVaccine(id);
  if (!petId) {
    throw new NotFoundError('VACCINE_NOT_FOUND', 'Vacuna no encontrada');
  }

  const authorship = await authorizePet(actor, petId, 'NURSING_WRITE');

  const target = await resolveEventTarget(petId, authorship);
  if (!target) {
    throw new ServiceUnavailableError('No se pudo resolver el dueño de la mascota para notificar');
  }
  if (!target.userId && !target.recipient) {
    throw new ConflictError('OWNER_WITHOUT_CONTACT', 'La mascota no tiene dueño con cuenta ni contacto para notificar');
  }

  const body = await request.json();
  const before = await vaccineRepository.getById(id);

  const updateVaccineUseCase = new UpdateVaccineUseCase(vaccineRepository, vaccinePublisher);

  const vaccine = await updateVaccineUseCase.execute({
    id: id,
    userId: target.userId,
    recipient: target.recipient,
    veterinaryId: authorship.veterinaryId,
    veterinaryName: target.veterinaryName,
    petId: petId,
    name: body.name,
    lotNumber: body.lotNumber,
    applicationDate: body.applicationDate ? new Date(body.applicationDate) : undefined,
    nextDoseDate: body.nextDoseDate !== undefined
      ? (body.nextDoseDate ? new Date(body.nextDoseDate) : null)
      : undefined,
    veterinarian: body.veterinarian,
    notes: body.notes,
    status: body.status,
  });

  // Laboratorio del carnet: columna propia, no la maneja el caso de uso de actualización
  if (body.manufacturer !== undefined && actor.clinic) {
    await saveExtras('vaccines', id, { manufacturer: body.manufacturer || null });
  }

  await auditRepository.record({
    tableName: 'vaccines',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges(
      {
        name: before?.nameValue,
        lot_number: before?.lotNumber,
        veterinarian: before?.veterinarian,
        status: before?.status,
      },
      {
        name: vaccine.nameValue,
        lot_number: vaccine.lotNumber,
        veterinarian: vaccine.veterinarian,
        status: vaccine.status,
      }
    ),
  });

  const responseDTO = VaccineMapper.toDTO(vaccine, target.userId ?? '');
  return NextResponse.json(responseDTO);
});
