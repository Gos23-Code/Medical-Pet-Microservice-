import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication.repository';
import { UpdateMedicationUseCase } from '@/src/application/use-cases/medications/update-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication.mapper';
import { UpdateMedicationDTO } from '@/src/application/dtos/medication.dto';
import { createMedicationsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { MEDICATION_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { SupabaseClinicalAuditRepository, buildChanges } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfMedication } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const repository = new SupabaseMedicationRepository();
const updateMedicationUseCase = new UpdateMedicationUseCase(repository);
const treatmentRepository = new SupabaseTreatmentRepository();
const auditRepository = new SupabaseClinicalAuditRepository();

const MEDICATION_EXTRA_COLUMNS = Object.values(MEDICATION_EXTRA_FIELDS).map((def) => def.column);

async function medicationExtrasFor(id: string) {
  const extras = await loadExtras('medications', [id], MEDICATION_EXTRA_COLUMNS);
  return toResponse(extras.get(id) ?? {}, MEDICATION_EXTRA_FIELDS);
}

// ✅ Obtener instancia del publisher
const medicationsPublisher = createMedicationsPublisher();

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/medications/[id] - Solo clínica con CLINICAL_WRITE. La mascota sale de la medicación.
export const PUT = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log(`📝 PUT /api/medications/${id} - Actualizando medicación`);

  const petId = await petIdOfMedication(id);
  if (!petId) {
    throw new NotFoundError('MEDICATION_NOT_FOUND', 'Medicación no encontrada');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body: UpdateMedicationDTO = await request.json();
  const parsed = parseClinicExtras(!!actor.clinic, body as unknown as Record<string, unknown>, MEDICATION_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  // 1. Obtener la medicación actual para comparar cambios
  const currentMedication = await repository.findById(id);
  if (!currentMedication) {
    return NextResponse.json({ success: false, message: 'Medicación no encontrada' }, { status: 404 });
  }

  // 2. Detectar qué campos se están actualizando (convertir a string para comparar)
  const currentDosage = currentMedication.dosage?.toString() || '';
  const newDosage = body.dosage?.toString() || '';
  const currentFrequency = currentMedication.frequency?.toString() || '';
  const newFrequency = body.frequency?.toString() || '';

  const dosageChanged = body.dosage !== undefined && newDosage !== currentDosage;
  const frequencyChanged = body.frequency !== undefined && newFrequency !== currentFrequency;

  if (!dosageChanged && !frequencyChanged && Object.keys(parsed.values).length === 0) {
    return NextResponse.json({ success: false, message: 'No hay cambios para actualizar' }, { status: 400 });
  }

  // 3. Obtener el tratamiento para saber su nombre
  const treatment = await treatmentRepository.findById(currentMedication.treatmentId);

  // 4. Actualizar la medicación
  await updateMedicationUseCase.execute(id, { ...body, userId: actor.userId, petId });

  await auditRepository.record({
    tableName: 'medications',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges(
      { dosage: currentDosage, frequency: currentFrequency },
      { dosage: newDosage, frequency: newFrequency }
    ),
  });

  await saveExtras('medications', id, parsed.values);

  // 5. Obtener la medicación actualizada
  const updatedMedication = await repository.findById(id);
  const dto = updatedMedication ? MedicationMapper.toDTO(updatedMedication) : null;

  // 6. ✅ PUBLICAR EN PUB/SUB - Si se actualizó la dosis o frecuencia
  const target = await resolveEventTarget(petId, authorship);
  if ((dosageChanged || frequencyChanged) && target) {
    let changeMessage = '';
    if (dosageChanged && frequencyChanged) {
      changeMessage = `dosis a "${newDosage}" y frecuencia a "${newFrequency}"`;
    } else if (dosageChanged) {
      changeMessage = `dosis a "${newDosage}"`;
    } else if (frequencyChanged) {
      changeMessage = `frecuencia a "${newFrequency}"`;
    }

    try {
      await medicationsPublisher.publishMedicationUpdated({
        medicationId: id,
        treatmentId: currentMedication.treatmentId,
        treatmentName: treatment?.description || 'tratamiento',
        petId: petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        name: currentMedication.name,
        oldDosage: currentDosage,
        newDosage: newDosage,
        oldFrequency: currentFrequency,
        newFrequency: newFrequency,
        changeMessage: changeMessage,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Evento MEDICATION_UPDATED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Medicación actualizada exitosamente',
    data: dto ? { ...dto, ...(await medicationExtrasFor(id)) } : null,
  });
});

// GET /api/medications/[id] - dueño o clínica con CLINICAL_READ
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log(`📝 GET /api/medications/${id} - Obteniendo medicación`);

  const petId = await petIdOfMedication(id);
  if (!petId) {
    throw new NotFoundError('MEDICATION_NOT_FOUND', 'Medicación no encontrada');
  }
  await authorizePet(actor, petId, 'CLINICAL_READ');

  const medication = await repository.findById(id);
  if (!medication) {
    return NextResponse.json({ success: false, message: 'Medicación no encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { ...MedicationMapper.toDTO(medication), ...(await medicationExtrasFor(id)) },
  });
});
