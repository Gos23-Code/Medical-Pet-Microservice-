// app/api/vaccines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { AddVaccineUseCase } from '@/src/application/use-cases/vaccine/add-vaccine.use-case';
import { GetVaccinesByPetUseCase } from '@/src/application/use-cases/vaccine/get-vaccine-by-pet.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { ConflictError, ServiceUnavailableError } from '@/src/infrastructure/http/api-error';
import { parseFields } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { VACCINE_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { vaccineDisplayStatus } from '@/src/application/clinical/vaccine-status';
import { todayInTimeZone } from '@/src/shared/business-date';

const vaccineRepository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();
const auditRepository = new SupabaseClinicalAuditRepository();

// POST /api/vaccines - Aplicar vacuna (solo clínica con NURSING_WRITE).
// Body: petId, name, applicationDate (obligatorios). Opcionales: lotNumber, manufacturer, nextDoseDate,
// veterinarian, notes, replacesVaccineId (la dosis anterior que esta reemplaza: queda como "Anterior").
export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  const body = await request.json();

  if (!body.petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }
  if (!body.name) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }
  if (!body.applicationDate) {
    return NextResponse.json({ error: 'applicationDate es requerido' }, { status: 400 });
  }

  const parsedExtra = parseClinicExtras(!!actor.clinic, body, VACCINE_EXTRA_FIELDS);
  if (!parsedExtra.ok) {
    return NextResponse.json({ success: false, message: parsedExtra.message }, { status: 400 });
  }

  const authorship = await authorizePet(actor, body.petId, 'NURSING_WRITE');

  // La dosis reemplazada tiene que ser de la misma mascota
  const replacesId = parsedExtra.values.replaces_vaccine_id as string | undefined;
  if (replacesId) {
    const [previous] = (await loadExtras('vaccines', [replacesId], ['pet_id'])).values();
    if (!previous || previous.pet_id !== body.petId) {
      return NextResponse.json({ success: false, message: 'replacesVaccineId no es una vacuna de esta mascota' }, { status: 400 });
    }
  }

  // Si no sabemos a quién notificar, no registramos la vacuna: la notificación es parte del flujo.
  const target = await resolveEventTarget(body.petId, authorship);
  if (!target) {
    throw new ServiceUnavailableError('No se pudo resolver el dueño de la mascota para notificar');
  }
  if (!target.userId && !target.recipient) {
    throw new ConflictError('OWNER_WITHOUT_CONTACT', 'La mascota no tiene dueño con cuenta ni contacto para notificar');
  }

  const addVaccineUseCase = new AddVaccineUseCase(vaccineRepository, vaccinePublisher);

  const vaccine = await addVaccineUseCase.execute({
    userId: target.userId,
    recipient: target.recipient,
    petId: body.petId,
    name: body.name,
    lotNumber: body.lotNumber,
    manufacturer: actor.clinic ? body.manufacturer : undefined,
    applicationDate: new Date(body.applicationDate),
    nextDoseDate: body.nextDoseDate ? new Date(body.nextDoseDate) : null,
    veterinarian: body.veterinarian,
    notes: body.notes,
    veterinaryId: authorship.veterinaryId,
    veterinaryName: target.veterinaryName,
    appliedByEmployeeId: authorship.employeeId,
  });

  // La dosis anterior queda marcada como reemplazada por esta
  if (replacesId) {
    await saveExtras('vaccines', replacesId, { replaced_by_id: vaccine.id });
  }

  await auditRepository.record({
    tableName: 'vaccines',
    recordId: vaccine.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  await saveExtras('vaccines', vaccine.id, { source: authorship.source });

  const responseDTO = VaccineMapper.toDTO(vaccine, target.userId ?? '');
  return NextResponse.json({ ...responseDTO, source: authorship.source, replacesVaccineId: replacesId ?? null }, { status: 201 });
});

// GET /api/vaccines?petId={id} - Carnet de vacunas (dueño o clínica con CLINICAL_READ).
// Cada dosis trae el estado del carnet: VIGENTE, POR_VENCER, VENCIDA, ANTERIOR o SIN_PROXIMA_DOSIS.
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  const petId = request.nextUrl.searchParams.get('petId');

  if (!petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }

  await authorizePet(actor, petId, 'CLINICAL_READ');

  const getVaccinesUseCase = new GetVaccinesByPetUseCase(vaccineRepository);
  const vaccines = await getVaccinesUseCase.execute(petId);

  const extras = await loadExtras(
    'vaccines',
    vaccines.map((v) => v.id),
    ['next_dose_date', 'replaced_by_id', 'source', 'veterinary_id']
  );
  const today = todayInTimeZone();

  const responseDTOs = vaccines.map((vaccine) => {
    const row = extras.get(vaccine.id) ?? {};
    const replacedById = (row.replaced_by_id as string | null) ?? null;
    return {
      ...VaccineMapper.toDTO(vaccine, vaccine.userId ?? ''),
      source: (row.source as string | undefined) ?? 'CLINIC',
      veterinaryId: (row.veterinary_id as string | null) ?? null,
      replacedById,
      displayStatus: vaccineDisplayStatus(
        { next_dose_date: (row.next_dose_date as string | null) ?? null, replaced_by_id: replacedById },
        today
      ),
    };
  });
  return NextResponse.json(responseDTOs);
});
