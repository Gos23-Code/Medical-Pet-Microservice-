import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfSurgery } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/surgery/[id]/corrections → nueva versión (motivo obligatorio). La cirugía original no cambia.
// GET  /api/surgery/[id]/corrections → versiones del acto.
// El estado (PATCH /api/surgery/[id]) no es una corrección: es el ciclo de vida.
const config = {
  table: 'pet_surgeries' as const,
  petIdOf: petIdOfSurgery,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: [
    'title', 'description', 'surgeryDate', 'durationMinutes', 'anesthesiaUsed', 'complications',
    'postOpInstructions', 'outcome', 'nextCheckupDate', 'startsAt', 'asaRisk',
  ] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
