import { ApiError } from '@/src/infrastructure/http/api-error';
import { requireIsoDate } from './date-utils';

// Desparasitación (DATOS_MASCOTA_CLINICA.md §6). Reglas puras.
// Solo se guarda la fecha de la última dosis. No hay próxima dosis ni estados de vencimiento:
// el intervalo depende del producto y no se calcula aquí.

export const DEWORMING_KINDS = ['INTERNAL', 'EXTERNAL'] as const;
export const DEWORMING_STATUSES = ['ACTIVE', 'ENTERED_IN_ERROR'] as const;

export type DewormingKind = (typeof DEWORMING_KINDS)[number];

export interface DewormingInput {
  kind: DewormingKind;
  product: string;
  activeIngredient: string | null;
  dose: string | null;
  weightKg: number | null;
  applicationDate: string;
  notes: string | null;
}

function invalid(message: string): never {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Valida el registro de una dosis. La fecha de aplicación no puede ser futura. */
export function validateDeworming(body: Record<string, unknown>, today: string): DewormingInput {
  if (typeof body.kind !== 'string' || !DEWORMING_KINDS.includes(body.kind as DewormingKind)) {
    invalid(`kind debe ser uno de: ${DEWORMING_KINDS.join(', ')}`);
  }
  const product = text(body.product);
  if (!product) {
    invalid('El producto es obligatorio');
  }

  const applicationDate = requireIsoDate(body.applicationDate, 'applicationDate');
  if (applicationDate > today) {
    invalid('applicationDate no puede ser futura');
  }

  let weightKg: number | null = null;
  if (body.weightKg !== undefined && body.weightKg !== null && body.weightKg !== '') {
    const parsed = Number(body.weightKg);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 200) {
      invalid('weightKg debe ser un número entre 0 y 200');
    }
    weightKg = parsed;
  }

  return {
    kind: body.kind as DewormingKind,
    product,
    activeIngredient: text(body.activeIngredient) || null,
    dose: text(body.dose) || null,
    weightKg,
    applicationDate,
    notes: text(body.notes) || null,
  };
}

/** Valores corregibles de una dosis. Solo se puede marcar como registrada por error o volver a activa. */
export function validateDewormingCorrection(values: Record<string, unknown>, today: string): void {
  if ('kind' in values && !DEWORMING_KINDS.includes(values.kind as DewormingKind)) {
    invalid(`kind debe ser uno de: ${DEWORMING_KINDS.join(', ')}`);
  }
  if ('product' in values && !text(values.product)) {
    invalid('El producto no puede quedar vacío');
  }
  if ('status' in values && !DEWORMING_STATUSES.includes(values.status as (typeof DEWORMING_STATUSES)[number])) {
    invalid(`status debe ser uno de: ${DEWORMING_STATUSES.join(', ')}`);
  }
  if ('applicationDate' in values) {
    const date = requireIsoDate(values.applicationDate, 'applicationDate');
    if (date > today) invalid('applicationDate no puede ser futura');
  }
}
