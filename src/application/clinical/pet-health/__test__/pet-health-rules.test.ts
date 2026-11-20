import { describe, it, expect } from '@jest/globals';
import { ApiError, ForbiddenError } from '@/src/infrastructure/http/api-error';
import {
  effectiveAllergyStatus,
  validateAllergyCorrection,
  validateNewAllergy,
  validateStoredAllergyStatus,
} from '../allergy-rules';
import { suggestsNeutering, validateNeutering } from '../neutering-rules';
import { validateDeworming, validateDewormingCorrection } from '../deworming-rules';
import { isIsoDate } from '../date-utils';
import { currentValues, lastVersionWhere, VersionRecord } from '../current-version';

const TODAY = '2026-11-19';

function errorOf(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('se esperaba un error y no se lanzó');
}

describe('alergias: reglas', () => {
  it('positivo: valida un alta y deja la categoría en OTHER si no viene', () => {
    const input = validateNewAllergy({ allergen: '  Penicilina ', severity: 'SEVERE', reaction: 'Urticaria' });
    expect(input).toEqual({ allergen: 'Penicilina', category: 'OTHER', reaction: 'Urticaria', severity: 'SEVERE', notes: null });
  });

  it('negativo: sin alérgeno o con gravedad inválida → 400', () => {
    expect(errorOf(() => validateNewAllergy({ allergen: '   ', severity: 'MILD' })).status).toBe(400);
    expect(errorOf(() => validateNewAllergy({ allergen: 'Pollo', severity: 'EXTREMA' })).status).toBe(400);
  });

  it('positivo: una corrección puede marcar RESOLVED o ENTERED_IN_ERROR', () => {
    expect(() => validateAllergyCorrection({ status: 'RESOLVED' })).not.toThrow();
    expect(() => validateAllergyCorrection({ status: 'ENTERED_IN_ERROR' })).not.toThrow();
  });

  it('negativo: una corrección no puede poner CONFIRMED (eso va por el endpoint de confirmación)', () => {
    const error = errorOf(() => validateAllergyCorrection({ status: 'CONFIRMED' }));
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.code).toBe('USE_CONFIRM_ENDPOINT');
  });

  it('negativo: corrección con estado o gravedad fuera de la lista → 400', () => {
    expect(errorOf(() => validateAllergyCorrection({ status: 'BORRADA' })).status).toBe(400);
    expect(errorOf(() => validateAllergyCorrection({ severity: 'LEVE' })).status).toBe(400);
  });

  it('positivo: el estado general acepta UNKNOWN y NONE_KNOWN', () => {
    expect(validateStoredAllergyStatus('UNKNOWN')).toBe('UNKNOWN');
    expect(validateStoredAllergyStatus('NONE_KNOWN')).toBe('NONE_KNOWN');
  });

  it('negativo: HAS_ALLERGIES no se declara a mano → 400', () => {
    expect(errorOf(() => validateStoredAllergyStatus('HAS_ALLERGIES')).status).toBe(400);
  });

  it('muestra HAS_ALLERGIES cuando hay alergias vigentes, aunque se haya declarado NONE_KNOWN', () => {
    expect(effectiveAllergyStatus('NONE_KNOWN', 1)).toBe('HAS_ALLERGIES');
    expect(effectiveAllergyStatus('UNKNOWN', 0)).toBe('UNKNOWN');
    expect(effectiveAllergyStatus('NONE_KNOWN', 0)).toBe('NONE_KNOWN');
  });
});

describe('esterilización: reglas', () => {
  it('positivo: YES con fecha pasada, y UNKNOWN sin fecha', () => {
    expect(validateNeutering('YES', '2024-03-01', TODAY)).toEqual({ status: 'YES', at: '2024-03-01' });
    expect(validateNeutering('UNKNOWN', undefined, TODAY)).toEqual({ status: 'UNKNOWN', at: null });
  });

  it('negativo: fecha con estado distinto de YES → 400', () => {
    expect(errorOf(() => validateNeutering('NO', '2024-03-01', TODAY)).status).toBe(400);
  });

  it('negativo: fecha futura o inexistente (2026-02-31) → 400', () => {
    expect(errorOf(() => validateNeutering('YES', '2027-01-01', TODAY)).status).toBe(400);
    expect(errorOf(() => validateNeutering('YES', '2026-02-31', TODAY)).status).toBe(400);
  });

  it('negativo: estado fuera de YES/NO/UNKNOWN → 400', () => {
    expect(errorOf(() => validateNeutering('QUIZAS', undefined, TODAY)).status).toBe(400);
  });

  it('sugiere actualizar el dato al registrar una cirugía de esterilización, no otras', () => {
    expect(suggestsNeutering('Orquiectomía (esterilización)')).toBe(true);
    expect(suggestsNeutering('Ovariohisterectomía')).toBe(true);
    expect(suggestsNeutering('Limpieza dental')).toBe(false);
  });
});

describe('desparasitación: reglas', () => {
  const base = { kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-11-10' };

  it('positivo: valida una dosis mínima con solo la fecha de aplicación', () => {
    const input = validateDeworming(base, TODAY);
    expect(input).toMatchObject({ kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-11-10', weightKg: null, dose: null });
  });

  it('negativo: tipo inválido, producto vacío o fecha futura → 400', () => {
    expect(errorOf(() => validateDeworming({ ...base, kind: 'OTRA' }, TODAY)).status).toBe(400);
    expect(errorOf(() => validateDeworming({ ...base, product: ' ' }, TODAY)).status).toBe(400);
    expect(errorOf(() => validateDeworming({ ...base, applicationDate: '2026-12-01' }, TODAY)).status).toBe(400);
  });

  it('negativo: peso fuera de rango → 400', () => {
    expect(errorOf(() => validateDeworming({ ...base, weightKg: 0 }, TODAY)).status).toBe(400);
    expect(errorOf(() => validateDeworming({ ...base, weightKg: 500 }, TODAY)).status).toBe(400);
  });

  it('una próxima dosis enviada no se guarda: el registro solo tiene la fecha de aplicación', () => {
    const input = validateDeworming({ ...base, nextDoseDate: '2026-12-10' }, TODAY);
    expect(input).not.toHaveProperty('nextDoseDate');
  });

  it('corrección: solo se puede marcar ENTERED_IN_ERROR o ACTIVE', () => {
    expect(() => validateDewormingCorrection({ status: 'ENTERED_IN_ERROR' }, TODAY)).not.toThrow();
    expect(errorOf(() => validateDewormingCorrection({ status: 'BORRADA' }, TODAY)).status).toBe(400);
  });
});

describe('fechas', () => {
  it('rechaza fechas inexistentes y formatos que no son YYYY-MM-DD', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('19/11/2026')).toBe(false);
  });
});

describe('versiones: estado actual', () => {
  const v = (version: number, values: Record<string, unknown>): VersionRecord => ({
    version,
    values,
    authorUserId: `u-${version}`,
    veterinaryId: null,
    authorRole: 'OWNER',
    createdAt: '2026-11-19T00:00:00Z',
  });

  it('aplica las versiones en orden, aunque lleguen desordenadas, y la última gana', () => {
    const base = { status: 'SUSPECTED', severity: 'MILD' };
    const current = currentValues(base, [v(2, { status: 'RESOLVED' }), v(1, { status: 'CONFIRMED', severity: 'SEVERE' })]);
    expect(current).toEqual({ status: 'RESOLVED', severity: 'SEVERE' });
    expect(base).toEqual({ status: 'SUSPECTED', severity: 'MILD' });
  });

  it('lastVersionWhere devuelve la última que cumple la condición', () => {
    const found = lastVersionWhere([v(1, { status: 'CONFIRMED' }), v(2, { notes: 'x' }), v(3, { status: 'CONFIRMED' })], (x) => x.values.status === 'CONFIRMED');
    expect(found?.version).toBe(3);
    expect(lastVersionWhere([], () => true)).toBeNull();
  });
});
