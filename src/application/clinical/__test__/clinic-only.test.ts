import { describe, it, expect } from '@jest/globals';
import { parseClinicExtras } from '../clinic-only';
import { parseVisitClinicalFields } from '../../visits/visit-clinical-fields';
import { SURGERY_EXTRA_FIELDS } from '../clinical-specs';

// Dos bodies, un endpoint: el dueño manda los campos base; la veterinaria puede añadir los extra.

describe('parseClinicExtras', () => {
  it('el dueño: los campos extra se ignoran (no es error)', () => {
    expect(parseClinicExtras(false, { startsAt: '2026-11-03T08:30:00-05:00', asaRisk: 9 }, SURGERY_EXTRA_FIELDS))
      .toEqual({ ok: true, values: {} });
  });

  it('la veterinaria: los campos extra se validan y guardan', () => {
    expect(parseClinicExtras(true, { asaRisk: 2 }, SURGERY_EXTRA_FIELDS))
      .toEqual({ ok: true, values: { asa_risk: 2 } });
  });

  it('la veterinaria: un extra inválido sí da error', () => {
    expect(parseClinicExtras(true, { asaRisk: 9 }, SURGERY_EXTRA_FIELDS).ok).toBe(false);
  });
});

describe('parseVisitClinicalFields con dos tipos de actor', () => {
  const body = {
    reason: 'Control',
    weight: 12.4,
    diagnosis: 'Herida sana',
    heartRate: 96,
    anamnesis: 'Apetito normal',
  };

  it('el dueño: solo toma los campos base; los de veterinaria se ignoran', () => {
    expect(parseVisitClinicalFields(body, false)).toEqual({
      ok: true,
      values: { weight: 12.4, diagnosis: 'Herida sana' },
    });
  });

  it('la veterinaria: toma base y extra', () => {
    expect(parseVisitClinicalFields(body, true)).toEqual({
      ok: true,
      values: { weight: 12.4, diagnosis: 'Herida sana', heart_rate: 96, anamnesis: 'Apetito normal' },
    });
  });
});
