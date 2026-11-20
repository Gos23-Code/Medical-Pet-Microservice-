import { ApiError } from '@/src/infrastructure/http/api-error';
import { isIsoDate } from './date-utils';

// Esterilización (DATOS_MASCOTA_CLINICA.md §4). Reglas puras.

export const NEUTERED_STATUSES = ['YES', 'NO', 'UNKNOWN'] as const;
export type NeuteredStatus = (typeof NEUTERED_STATUSES)[number];

export interface NeuteringInput {
  status: NeuteredStatus;
  /** Fecha de la esterilización (opcional, solo si status = YES). Puede ser solo mes y año en el futuro: hoy es día completo. */
  at: string | null;
}

function invalid(message: string): never {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

/**
 * Valida el estado de esterilización.
 * - neuteredAt solo si el estado es YES.
 * - La fecha no puede ser futura ni anterior al nacimiento (si Pets envía birthDate).
 */
export function validateNeutering(status: unknown, at: unknown, today: string, birthDate: string | null = null): NeuteringInput {
  if (typeof status !== 'string' || !NEUTERED_STATUSES.includes(status as NeuteredStatus)) {
    invalid(`neuteredStatus debe ser uno de: ${NEUTERED_STATUSES.join(', ')}`);
  }

  const hasDate = at !== undefined && at !== null && at !== '';
  if (!hasDate) {
    return { status: status as NeuteredStatus, at: null };
  }
  if (status !== 'YES') {
    invalid('neuteredAt solo puede enviarse cuando neuteredStatus es YES');
  }
  if (!isIsoDate(at)) {
    invalid('neuteredAt debe ser una fecha YYYY-MM-DD válida');
  }
  if (at > today) {
    invalid('neuteredAt no puede ser una fecha futura');
  }
  if (birthDate && at < birthDate) {
    invalid('neuteredAt no puede ser anterior a la fecha de nacimiento de la mascota');
  }
  return { status: 'YES', at };
}

/** Procedimientos que indican esterilización o castración (sugerencia al registrar una cirugía). */
const NEUTERING_PROCEDURE = /esteriliz|castra|orquiect|ovariohisterect|ovariectom/i;

export function suggestsNeutering(surgeryTitle: string): boolean {
  return NEUTERING_PROCEDURE.test(surgeryTitle);
}
