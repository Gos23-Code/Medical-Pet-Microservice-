import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication-treatment.repository';
import { AddMedicationUseCase } from '@/src/application/use-cases/treatments/add-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication-treatment.mapper';
import { AddMedicationDTO } from '@/src/application/dtos/medication-treatment.dto';
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { loadExtras, saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { MEDICATION_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfTreatment } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

const repository = new SupabaseMedicationRepository();
const addMedicationUseCase = new AddMedicationUseCase(repository);
const treatmentRepository = new SupabaseTreatmentRepository();
const auditRepository = new SupabaseClinicalAuditRepository();

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();

// POST /api/treatments/[id]/add-medication - Solo clínica con CLINICAL_WRITE.
// La mascota sale del tratamiento (no del body).
export const POST = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, actor) => {
  const { id } = await context.params;
  console.log(`📝 POST /api/treatments/${id}/add-medication - Agregando medicamento`);

  const petId = await petIdOfTreatment(id);
  if (!petId) {
    throw new NotFoundError('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const body: AddMedicationDTO = await request.json();

  const treatment = await treatmentRepository.findById(id);
  if (!treatment) {
    return NextResponse.json({ success: false, message: 'Tratamiento no encontrado' }, { status: 404 });
  }

  const parsed = parseClinicExtras(!!actor.clinic, body as unknown as Record<string, unknown>, MEDICATION_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const medication = await addMedicationUseCase.execute(id, { ...body, userId: actor.userId, petId });
  await saveExtras('medications', medication.id, parsed.values);
  const dto = { ...MedicationMapper.toDTO(medication), ...toResponse(parsed.values, MEDICATION_EXTRA_FIELDS) };

  await auditRepository.record({
    tableName: 'medications',
    recordId: medication.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  const target = await resolveEventTarget(petId, authorship);
  if (target) {
    try {
      await treatmentsPublisher.publishMedicationAdded({
        treatmentId: id,
        treatmentName: treatment.description,
        petId: petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        medicationId: medication.id,
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        duration: body.duration,
        addedAt: new Date().toISOString(),
      });
      console.log('✅ Evento MEDICATION_ADDED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Medicamento agregado exitosamente',
    data: dto,
  }, { status: 201 });
});
