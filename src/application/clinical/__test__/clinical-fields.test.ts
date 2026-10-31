import { describe, it, expect } from '@jest/globals';
import { parseFields, toResponse, FieldSpec } from '../field-spec';
import { vaccineDisplayStatus } from '../vaccine-status';
import { parseLabResults } from '../lab-results';
import { SURGERY_EXTRA_FIELDS, TREATMENT_EXTRA_FIELDS, MEDICATION_EXTRA_FIELDS, LAB_EXTRA_FIELDS } from '../clinical-specs';

const SPEC: FieldSpec = {
  count: { column: 'count_col', type: 'int', min: 1, max: 5 },
  ratio: { column: 'ratio_col', type: 'number', min: 0, max: 1 },
  day: { column: 'day_col', type: 'date' },
  at: { column: 'at_col', type: 'datetime' },
  kind: { column: 'kind_col', type: 'enum', values: ['A', 'B'] },
  note: { column: 'note_col', type: 'text', maxLength: 5 },
  ref: { column: 'ref_col', type: 'uuid' },
};

describe('parseFields', () => {
  it('convierte cada tipo a su columna y omite lo que no llegó', () => {
    const result = parseFields(
      { count: '3', ratio: 0.5, day: '2026-10-28', at: '2026-10-28T13:30:00-05:00', kind: 'b', note: 'hola', ref: '00000000-0000-4000-8000-000000000001' },
      SPEC
    );
    expect(result).toEqual({
      ok: true,
      values: {
        count_col: 3,
        ratio_col: 0.5,
        day_col: '2026-10-28',
        at_col: '2026-10-28T18:30:00.000Z',
        kind_col: 'B',
        note_col: 'hola',
        ref_col: '00000000-0000-4000-8000-000000000001',
      },
    });
  });

  it('guarda null cuando el campo llega vacío explícitamente', () => {
    expect(parseFields({ note: '' }, SPEC)).toEqual({ ok: true, values: { note_col: null } });
  });

  it.each([
    [{ count: 6 }, 'count'],
    [{ count: 2.5 }, 'count'],
    [{ ratio: 1.5 }, 'ratio'],
    [{ day: '28/10/2026' }, 'day'],
    [{ at: 'no es fecha' }, 'at'],
    [{ kind: 'C' }, 'kind'],
    [{ note: 'demasiado largo' }, 'note'],
    [{ ref: 'abc' }, 'ref'],
  ])('rechaza %o', (body, field) => {
    const result = parseFields(body, SPEC);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(field);
  });
});

describe('toResponse', () => {
  it('pasa de columnas a camelCase y deja null lo que la fila no tiene', () => {
    expect(toResponse({ count_col: 4 }, SPEC)).toEqual({
      count: 4, ratio: null, day: null, at: null, kind: null, note: null, ref: null,
    });
  });
});

describe('especificaciones del mockup', () => {
  it('cirugía: ASA solo de 1 a 5', () => {
    expect(parseFields({ asaRisk: 1 }, SURGERY_EXTRA_FIELDS).ok).toBe(true);
    expect(parseFields({ asaRisk: 6 }, SURGERY_EXTRA_FIELDS).ok).toBe(false);
  });

  it('tratamiento y medicación: solo estados válidos', () => {
    expect(parseFields({ status: 'suspendido' }, TREATMENT_EXTRA_FIELDS)).toEqual({
      ok: true, values: { status: 'SUSPENDIDO' },
    });
    expect(parseFields({ status: 'REACCION' }, MEDICATION_EXTRA_FIELDS).ok).toBe(true);
    expect(parseFields({ status: 'PAUSADO' }, MEDICATION_EXTRA_FIELDS).ok).toBe(false);
  });

  it('laboratorio: estado global con las opciones del mockup', () => {
    expect(parseFields({ status: 'FUERA_DE_RANGO' }, LAB_EXTRA_FIELDS).ok).toBe(true);
    expect(parseFields({ status: 'BIEN' }, LAB_EXTRA_FIELDS).ok).toBe(false);
  });
});

describe('parseLabResults', () => {
  it('acepta parámetros con su orden de llegada', () => {
    const result = parseLabResults([
      { parameter: 'ALT', result: '112', unit: 'U/L', reference: '10 – 100', flag: 'ALTO' },
      { parameter: 'Creatinina', result: '1,1', unit: 'mg/dL', reference: '0,5 – 1,8', flag: 'normal' },
    ]);
    expect(result).toEqual({
      ok: true,
      rows: [
        { parameter_name: 'ALT', result: '112', unit: 'U/L', reference_text: '10 – 100', flag: 'ALTO', position: 0 },
        { parameter_name: 'Creatinina', result: '1,1', unit: 'mg/dL', reference_text: '0,5 – 1,8', flag: 'NORMAL', position: 1 },
      ],
    });
  });

  it('sin results no hay filas', () => {
    expect(parseLabResults(undefined)).toEqual({ ok: true, rows: [] });
  });

  it('rechaza lo que no es lista, o un parámetro sin nombre o sin resultado', () => {
    expect(parseLabResults('ALT').ok).toBe(false);
    expect(parseLabResults([{ parameter: 'ALT' }]).ok).toBe(false);
    expect(parseLabResults([{ result: '5' }]).ok).toBe(false);
  });
});

describe('vaccineDisplayStatus (carnet del mockup)', () => {
  const today = '2026-10-28';

  it('ANTERIOR cuando otra dosis la reemplazó, aunque esté vencida', () => {
    expect(vaccineDisplayStatus({ next_dose_date: '2025-01-01', replaced_by_id: 'x' }, today)).toBe('ANTERIOR');
  });

  it('VENCIDA cuando la próxima dosis ya pasó', () => {
    expect(vaccineDisplayStatus({ next_dose_date: '2026-05-18', replaced_by_id: null }, today)).toBe('VENCIDA');
  });

  it('POR_VENCER a 30 días o menos ("Vence el 18 nov")', () => {
    expect(vaccineDisplayStatus({ next_dose_date: '2026-11-18', replaced_by_id: null }, today)).toBe('POR_VENCER');
    expect(vaccineDisplayStatus({ next_dose_date: '2026-11-27', replaced_by_id: null }, today)).toBe('POR_VENCER');
  });

  it('VIGENTE cuando faltan más de 30 días', () => {
    expect(vaccineDisplayStatus({ next_dose_date: '2027-09-22', replaced_by_id: null }, today)).toBe('VIGENTE');
  });

  it('SIN_PROXIMA_DOSIS cuando no tiene fecha de próxima dosis', () => {
    expect(vaccineDisplayStatus({ next_dose_date: null, replaced_by_id: null }, today)).toBe('SIN_PROXIMA_DOSIS');
  });
});
