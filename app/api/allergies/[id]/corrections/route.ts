import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { petIdOfAllergy } from '@/src/infrastructure/database/pet-lookup';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';
import { validateAllergyCorrection } from '@/src/application/clinical/pet-health/allergy-rules';

// POST /api/allergies/[id]/corrections → corrige una alergia con motivo (versión, la fila original no cambia).
// Confirmar NO va aquí: POST /api/allergies/[id]/confirm. Dueño: solo sus alergias (SUSPECTED, RESOLVED, ENTERED_IN_ERROR).
// GET  /api/allergies/[id]/corrections → lista las versiones.
const config = {
  table: 'pet_allergies' as const,
  petIdOf: petIdOfAllergy,
  writeNeed: 'CLINICAL_WRITE' as const,
  fields: ['allergen', 'category', 'reaction', 'severity', 'status', 'notes'] as const,
  validate: validateAllergyCorrection,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
