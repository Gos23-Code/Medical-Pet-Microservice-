import { ApiError, ForbiddenError } from '@/src/infrastructure/http/api-error';

// Alergias (DATOS_MASCOTA_CLINICA.md §5). Reglas puras: sin HTTP ni base de datos.

export const ALLERGY_CATEGORIES = ['DRUG', 'FOOD', 'ENVIRONMENT', 'OTHER'] as const;
export const ALLERGY_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE'] as const;
export const ALLERGY_STATUSES = ['SUSPECTED', 'CONFIRMED', 'RESOLVED', 'ENTERED_IN_ERROR'] as const;
/** Estados que cuentan como alergia vigente (alerta en la clínica). */
export const ACTIVE_ALLERGY_STATUSES: readonly string[] = ['SUSPECTED', 'CONFIRMED'];
/** Lo que se puede guardar en el perfil. HAS_ALLERGIES se calcula, no se guarda. */
export const STORED_ALLERGY_STATUSES = ['UNKNOWN', 'NONE_KNOWN'] as const;

export type AllergyCategory = (typeof ALLERGY_CATEGORIES)[number];
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];
export type StoredAllergyStatus = (typeof STORED_ALLERGY_STATUSES)[number];
export type PetAllergyStatus = StoredAllergyStatus | 'HAS_ALLERGIES';

export interface NewAllergyInput {
  allergen: string;
  category: AllergyCategory;
  reaction: string | null;
  severity: AllergySeverity;
  notes: string | null;
}

function invalid(message: string): never {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredEnum<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    invalid(`${field} debe ser uno de: ${values.join(', ')}`);
  }
  return value as T;
}

/** Valida el alta de una alergia. La clínica y el dueño usan el mismo body. */
export function validateNewAllergy(body: Record<string, unknown>): NewAllergyInput {
  const allergen = text(body.allergen);
  if (!allergen) {
    invalid('El alérgeno es obligatorio');
  }
  return {
    allergen,
    category: body.category === undefined || body.category === null
      ? 'OTHER'
      : requiredEnum(body.category, ALLERGY_CATEGORIES, 'category'),
    reaction: text(body.reaction) || null,
    severity: requiredEnum(body.severity, ALLERGY_SEVERITIES, 'severity'),
    notes: text(body.notes) || null,
  };
}

/**
 * Valida los campos que se pueden corregir de una alergia (POST .../corrections).
 * CONFIRMED no pasa por aquí: lo confirma solo una clínica en su endpoint propio.
 */
export function validateAllergyCorrection(values: Record<string, unknown>): void {
  if ('allergen' in values && !text(values.allergen)) invalid('El alérgeno no puede quedar vacío');
  if ('category' in values) requiredEnum(values.category, ALLERGY_CATEGORIES, 'category');
  if ('severity' in values) requiredEnum(values.severity, ALLERGY_SEVERITIES, 'severity');
  if ('status' in values) {
    if (values.status === 'CONFIRMED') {
      throw new ForbiddenError('USE_CONFIRM_ENDPOINT', 'Para confirmar una alergia usa POST /api/allergies/{id}/confirm (clínica)');
    }
    requiredEnum(values.status, ALLERGY_STATUSES, 'status');
  }
}

/** Valida el estado general que el dueño o la clínica declaran (UNKNOWN o NONE_KNOWN). */
export function validateStoredAllergyStatus(value: unknown): StoredAllergyStatus {
  if (value === 'HAS_ALLERGIES') {
    invalid('HAS_ALLERGIES no se declara: se calcula cuando hay alergias activas');
  }
  return requiredEnum(value, STORED_ALLERGY_STATUSES, 'allergyStatus');
}

/** Estado que se muestra: si hay alergias vigentes, siempre HAS_ALLERGIES; si no, lo declarado. */
export function effectiveAllergyStatus(stored: StoredAllergyStatus, activeCount: number): PetAllergyStatus {
  return activeCount > 0 ? 'HAS_ALLERGIES' : stored;
}

export function isActiveAllergy(status: string): boolean {
  return ACTIVE_ALLERGY_STATUSES.includes(status);
}
