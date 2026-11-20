import { withCorrections } from '@/src/infrastructure/clinical/act-versions';
// app/api/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { GetTreatmentUseCase } from '@/src/application/use-cases/treatments/get-treatment.use-case';
import { IsActiveUseCase } from '@/src/application/use-cases/treatments/is-active.use-case';
import { TreatmentMapper } from '@/src/application/mappers/treatment.mapper';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { Medication } from '@/src/domain/repositories/treatment.repository';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { petIdOfTreatment } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { loadExtras } from '@/src/infrastructure/database/clinical-extras';
import { toResponse } from '@/src/application/clinical/field-spec';
import { TREATMENT_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';

const repository = new SupabaseTreatmentRepository();
const getTreatmentUseCase = new GetTreatmentUseCase(repository);
const isActiveUseCase = new IsActiveUseCase(repository);

const TREATMENT_EXTRA_COLUMNS = Object.values(TREATMENT_EXTRA_FIELDS).map((def) => def.column);

// Columnas del mockup (estado, indicaciones, suspensión) que no maneja el caso de uso original.
async function treatmentExtrasFor(id: string) {
  const extras = await loadExtras('treatments', [id], TREATMENT_EXTRA_COLUMNS);
  return toResponse(extras.get(id) ?? {}, TREATMENT_EXTRA_FIELDS);
}

type RouteContext = { params: Promise<{ id: string }> };

// PUT ya no sobrescribe: la corrección es POST /api/treatments/{id}/corrections (motivo obligatorio).
export const PUT = overwriteRefused('/api/treatments/{id}/corrections');

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

  return NextResponse.json(await withCorrections('treatments', {
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
  }));
});
