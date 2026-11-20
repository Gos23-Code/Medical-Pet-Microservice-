import { describe, it, expect } from '@jest/globals';
import { assertCanCorrect, assertSameAuthorSide, requireReason, ActRef, CorrectionActor } from '../act-integrity';
import { ApiError } from '@/src/infrastructure/http/api-error';

const VET_A = 'vet-a';
const VET_B = 'vet-b';
const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

const clinicAct: ActRef = { source: 'CLINIC', veterinaryId: VET_A, createdByUserId: 'emp-user-1' };
const ownerAct: ActRef = { source: 'OWNER', veterinaryId: null, createdByUserId: OWNER };

const owner: CorrectionActor = { userId: OWNER, veterinaryId: null };
const clinicA: CorrectionActor = { userId: 'emp-user-2', veterinaryId: VET_A };
const clinicB: CorrectionActor = { userId: 'emp-user-3', veterinaryId: VET_B };

/** Devuelve el código de error que lanza `fn`, o undefined si no lanza. */
function errorCode(fn: () => void): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof ApiError ? error.code : 'NO_API_ERROR';
  }
}

describe('assertCanCorrect', () => {
  it('positivo: la clínica emisora puede corregir su acto (cualquier empleado de la clínica)', () => {
    expect(errorCode(() => assertCanCorrect(clinicA, clinicAct))).toBeUndefined();
  });

  it('positivo: el dueño puede corregir lo que él registró', () => {
    expect(errorCode(() => assertCanCorrect(owner, ownerAct))).toBeUndefined();
  });

  it('negativo: el propietario no puede corregir un acto de la clínica (403)', () => {
    expect(errorCode(() => assertCanCorrect(owner, clinicAct))).toBe('OWNER_CANNOT_CORRECT_CLINIC_ACT');
  });

  it('positivo: un editor compartido (no dueño) puede corregir un acto del lado del dueño', () => {
    const editor: CorrectionActor = { userId: OTHER_OWNER, veterinaryId: null };
    expect(errorCode(() => assertCanCorrect(editor, ownerAct))).toBeUndefined();
  });

  it('negativo: la clínica B no puede corregir un acto de la clínica A (403)', () => {
    expect(errorCode(() => assertCanCorrect(clinicB, clinicAct))).toBe('OTHER_CLINIC_ACT');
  });

  it('negativo: la clínica no puede corregir un acto registrado por el propietario (403)', () => {
    expect(errorCode(() => assertCanCorrect(clinicA, ownerAct))).toBe('NOT_CLINIC_ACT');
  });
});

describe('assertSameAuthorSide (modificar y borrar)', () => {
  const ownerAuthorship = { source: 'OWNER' as const, veterinaryId: null };
  const clinicAAuthorship = { source: 'CLINIC' as const, veterinaryId: VET_A };
  const clinicBAuthorship = { source: 'CLINIC' as const, veterinaryId: VET_B };

  it('positivo: el dueño modifica o borra su propio acto (sin clínica)', () => {
    expect(errorCode(() => assertSameAuthorSide(ownerAuthorship, { veterinaryId: null }))).toBeUndefined();
  });

  it('positivo: la clínica modifica o borra un acto de su clínica', () => {
    expect(errorCode(() => assertSameAuthorSide(clinicAAuthorship, { veterinaryId: VET_A }))).toBeUndefined();
  });

  it('negativo: el dueño no puede modificar ni borrar un acto de la clínica', () => {
    expect(errorCode(() => assertSameAuthorSide(ownerAuthorship, { veterinaryId: VET_A }))).toBe('OWNER_CANNOT_TOUCH_CLINIC_ACT');
  });

  it('negativo: la clínica no puede modificar ni borrar lo que registró el dueño', () => {
    expect(errorCode(() => assertSameAuthorSide(clinicAAuthorship, { veterinaryId: null }))).toBe('CLINIC_CANNOT_TOUCH_OWNER_ACT');
  });

  it('negativo: otra clínica no puede modificar ni borrar el acto de la clínica A', () => {
    expect(errorCode(() => assertSameAuthorSide(clinicBAuthorship, { veterinaryId: VET_A }))).toBe('OTHER_CLINIC_ACT');
  });
});

describe('requireReason', () => {
  it('positivo: devuelve el motivo sin espacios sobrantes', () => {
    expect(requireReason('  Error de dosis  ')).toBe('Error de dosis');
  });

  it('negativo: sin motivo lanza 400 REASON_REQUIRED', () => {
    expect(errorCode(() => requireReason(undefined))).toBe('REASON_REQUIRED');
  });

  it('negativo: un motivo demasiado corto o solo espacios también es 400', () => {
    expect(errorCode(() => requireReason('ok'))).toBe('REASON_REQUIRED');
    expect(errorCode(() => requireReason('      '))).toBe('REASON_REQUIRED');
  });
});
