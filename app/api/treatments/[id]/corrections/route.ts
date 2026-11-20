import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfTreatment } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/treatments/[id]/corrections → nueva versión (motivo obligatorio). El tratamiento original no cambia.
// GET  /api/treatments/[id]/corrections → versiones del acto.
const config = {
  table: 'treatments' as const,
  petIdOf: petIdOfTreatment,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: ['startDate', 'endDate', 'notes', 'status', 'instructions', 'suspensionReason'] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
