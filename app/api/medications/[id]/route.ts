import { withCorrections } from '@/src/infrastructure/clinical/act-versions';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication.repository';
import { MedicationMapper } from '@/src/application/mappers/medication.mapper';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { loadExtras } from '@/src/infrastructure/database/clinical-extras';
import { toResponse } from '@/src/application/clinical/field-spec';
import { MEDICATION_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';
import { petIdOfMedication } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';

const repository = new SupabaseMedicationRepository();

const MEDICATION_EXTRA_COLUMNS = Object.values(MEDICATION_EXTRA_FIELDS).map((def) => def.column);

async function medicationExtrasFor(id: string) {
  const extras = await loadExtras('medications', [id], MEDICATION_EXTRA_COLUMNS);
  return toResponse(extras.get(id) ?? {}, MEDICATION_EXTRA_FIELDS);
}

type RouteContext = { params: Promise<{ id: string }> };

// PUT ya no sobrescribe: la corrección es POST /api/medications/{id}/corrections (motivo obligatorio).
export const PUT = overwriteRefused('/api/medications/{id}/corrections');

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

  return NextResponse.json(await withCorrections('medications', {
    success: true,
    data: { ...MedicationMapper.toDTO(medication), ...(await medicationExtrasFor(id)) },
  }));
});
