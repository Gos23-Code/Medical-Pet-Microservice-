import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfVaccine } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/vaccines/[id]/corrections → crea una versión (motivo obligatorio). La vacuna original no cambia.
// GET  /api/vaccines/[id]/corrections → lista las versiones.
const config = {
  table: 'vaccines' as const,
  petIdOf: petIdOfVaccine,
  writeNeed: 'NURSING_WRITE' as const,
  fields: ['name', 'lotNumber', 'applicationDate', 'nextDoseDate', 'veterinarian', 'notes', 'status'] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
