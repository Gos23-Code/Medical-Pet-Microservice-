import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfVisit } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/visits/[id]/corrections → nueva versión (motivo obligatorio). La visita original no cambia.
// GET  /api/visits/[id]/corrections → versiones del acto.
const config = {
  table: 'veterinary_visits' as const,
  petIdOf: petIdOfVisit,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: [
    'reason', 'date', 'veterinarian', 'diagnosis', 'notes', 'weight', 'temperature',
    'heartRate', 'respiratoryRate', 'mucousMembranes', 'bodyConditionScore', 'anamnesis', 'physicalExam', 'plan',
  ] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
