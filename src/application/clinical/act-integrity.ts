import { ApiError, ForbiddenError } from '@/src/infrastructure/http/api-error';

// Integridad de los actos clínicos (db/scripts/005_integridad_actos.sql).
// Regla: solo corrige quien registró el acto. El dueño, solo sus propios registros (source OWNER).
// La clínica, cualquier empleado de la MISMA clínica emisora (source CLINIC). Nunca se borra nada.

export type ActSource = 'OWNER' | 'CLINIC';

/** Lo que guarda la fila original del acto. */
export interface ActRef {
  source: ActSource;
  veterinaryId: string | null;
  createdByUserId: string | null;
}

/** Quién intenta corregir, según el token y la autorización de la ruta. */
export interface CorrectionActor {
  userId: string;
  /** Clínica del token. Null si el actor es el dueño. */
  veterinaryId: string | null;
}

export const MIN_REASON_LENGTH = 5;

/** Devuelve el motivo limpio o lanza 400 si falta o es muy corto. */
export function requireReason(reason: unknown): string {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < MIN_REASON_LENGTH) {
    throw new ApiError(400, 'REASON_REQUIRED', `El motivo de la corrección es obligatorio (mínimo ${MIN_REASON_LENGTH} caracteres)`);
  }
  return text;
}

/**
 * Mismo lado: el dueño solo toca actos sin clínica (los que registró él);
 * la clínica solo toca actos de SU clínica. Ningún lado toca lo del otro.
 * Aplica a modificar y a borrar.
 */
export function assertSameAuthorSide(
  authorship: { source: ActSource; veterinaryId: string | null },
  act: { veterinaryId: string | null }
): void {
  if (authorship.source === 'OWNER') {
    if (act.veterinaryId !== null) {
      throw new ForbiddenError('OWNER_CANNOT_TOUCH_CLINIC_ACT', 'El propietario no puede modificar ni borrar actos de una clínica');
    }
    return;
  }

  if (act.veterinaryId === null) {
    throw new ForbiddenError('CLINIC_CANNOT_TOUCH_OWNER_ACT', 'La clínica no puede modificar ni borrar lo que registró el propietario');
  }
  if (act.veterinaryId !== authorship.veterinaryId) {
    throw new ForbiddenError('OTHER_CLINIC_ACT', 'Otra clínica no puede modificar ni borrar este acto');
  }
}

/**
 * Confirmar una alergia declarada por el dueño (SUSPECTED, source OWNER).
 * Solo una clínica (veterinario con CLINICAL_WRITE, que ya verificó la ruta) puede confirmar.
 * El dueño nunca confirma lo suyo: es la regla de confiabilidad del dato (DATOS_MASCOTA_CLINICA §10.2).
 */
export function assertCanConfirm(actor: CorrectionActor, act: { source: ActSource; currentStatus: string }): void {
  if (!actor.veterinaryId) {
    throw new ForbiddenError('OWNER_CANNOT_CONFIRM', 'El propietario no puede confirmar una alergia: la confirma un veterinario');
  }
  if (act.source !== 'OWNER') {
    throw new ForbiddenError('NOT_OWNER_DECLARED', 'Solo se confirman las alergias que declaró el propietario');
  }
  if (act.currentStatus !== 'SUSPECTED') {
    throw new ApiError(409, 'ALLERGY_NOT_SUSPECTED', `La alergia ya está en estado ${act.currentStatus}`);
  }
}

/** Decide si el actor puede corregir el acto. Lanza 403 con un código específico si no. */
export function assertCanCorrect(actor: CorrectionActor, act: ActRef): void {
  if (!actor.veterinaryId) {
    // Dueño
    // El dueño y sus editores compartidos corrigen lo del lado del dueño (no hay otro dueño en Pets).
    if (act.source !== 'OWNER') {
      throw new ForbiddenError('OWNER_CANNOT_CORRECT_CLINIC_ACT', 'El propietario no puede corregir actos de una clínica');
    }
    return;
  }

  // Clínica
  if (act.source !== 'CLINIC') {
    throw new ForbiddenError('NOT_CLINIC_ACT', 'Este acto lo registró el propietario, no una clínica');
  }
  if (act.veterinaryId !== actor.veterinaryId) {
    throw new ForbiddenError('OTHER_CLINIC_ACT', 'Solo la clínica emisora puede corregir este acto');
  }
}
