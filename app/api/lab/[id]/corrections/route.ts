import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfLabTest } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/lab/[id]/corrections → nueva versión (motivo obligatorio). El examen original no cambia.
// GET  /api/lab/[id]/corrections → versiones del acto.
const config = {
  table: 'lab_tests' as const,
  petIdOf: petIdOfLabTest,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: ['name', 'result', 'normal_range', 'date', 'notes', 'status', 'interpretation', 'laboratoryName', 'results'] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
