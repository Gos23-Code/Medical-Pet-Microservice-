import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfMedication } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/medications/[id]/corrections → nueva versión (motivo obligatorio). La medicación original no cambia.
// GET  /api/medications/[id]/corrections → versiones del acto.
const config = {
  table: 'medications' as const,
  petIdOf: petIdOfMedication,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: ['name', 'dosage', 'frequency', 'duration', 'status', 'startDate', 'endDate', 'reactionNote'] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
