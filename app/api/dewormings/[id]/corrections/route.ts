import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfDeworming } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';
import { validateDewormingCorrection } from '@/src/application/clinical/pet-health/deworming-rules';
import { todayInTimeZone } from '@/src/shared/business-date';

// POST /api/dewormings/[id]/corrections → corrige una dosis con motivo (versión). Marcar status ENTERED_IN_ERROR para anularla.
// GET  /api/dewormings/[id]/corrections → lista las versiones.
const config = {
  table: 'pet_dewormings' as const,
  petIdOf: petIdOfDeworming,
  writeNeed: 'NURSING_WRITE' as const,
  fields: ['kind', 'product', 'activeIngredient', 'dose', 'weightKg', 'applicationDate', 'notes', 'status'] as const,
  validate: (values: Record<string, unknown>) => validateDewormingCorrection(values, todayInTimeZone()),
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
