import { describe, it, expect } from '@jest/globals';
import { parseVisitClinicalFields } from '../visit-clinical-fields';
import { toVisitResponse, VisitRow } from '../../mappers/visit-response.mapper';

// Campos de "Registrar visita" (diseño 13 oct): mismo body para dueño y clínica, todos opcionales.

describe('parseVisitClinicalFields', () => {
  it('traduce los campos del diseño a columnas de veterinary_visits', () => {
    const result = parseVisitClinicalFields({
      weight: 12.4,
      temperature: 38.6,
      heartRate: 96,
      respiratoryRate: 22,
      mucousMembranes: 'rosadas',
      bodyConditionScore: 5,
      anamnesis: 'Apetito bajo',
      physicalExam: 'Sin hallazgos',
      diagnosis: 'Herida sana',
      plan: 'Control en 15 días',
      notes: 'Notas',
      veterinarian: 'Dra. Sara Ruiz',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        weight: 12.4,
        temperature: 38.6,
        heart_rate: 96,
        respiratory_rate: 22,
        mucous_membranes: 'ROSADAS',
        body_condition_score: 5,
        anamnesis: 'Apetito bajo',
        physical_exam: 'Sin hallazgos',
        diagnosis: 'Herida sana',
        plan: 'Control en 15 días',
        notes: 'Notas',
        veterinarian: 'Dra. Sara Ruiz',
      },
    });
  });

  it('un body sin campos clínicos no genera valores (el dueño no escribe nada aquí)', () => {
    expect(parseVisitClinicalFields({ petId: 'x', reason: 'y' })).toEqual({ ok: true, values: {} });
  });

  it('un campo vacío explícito se guarda como null', () => {
    expect(parseVisitClinicalFields({ plan: '' })).toEqual({ ok: true, values: { plan: null } });
    expect(parseVisitClinicalFields({ weight: null })).toEqual({ ok: true, values: { weight: null } });
  });

  it('acepta números como texto (formularios)', () => {
    expect(parseVisitClinicalFields({ temperature: '38.6' })).toEqual({
      ok: true,
      values: { temperature: 38.6 },
    });
  });

  it.each([
    [{ weight: 0 }, 'weight'],
    [{ weight: 'abc' }, 'weight'],
    [{ temperature: 50 }, 'temperature'],
    [{ heartRate: 96.5 }, 'heartRate'],
    [{ respiratoryRate: 0 }, 'respiratoryRate'],
    [{ bodyConditionScore: 10 }, 'bodyConditionScore'],
    [{ bodyConditionScore: 0 }, 'bodyConditionScore'],
    [{ mucousMembranes: 'AZULES' }, 'mucousMembranes'],
  ])('rechaza valores fuera de rango o inválidos: %o', (body, field) => {
    const result = parseVisitClinicalFields(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(field);
  });
});

describe('toVisitResponse', () => {
  it('expone los campos en camelCase, incluidos los de clínica', () => {
    const row = {
      id: 'v1',
      pet_id: 'p1',
      date: '2026-10-28',
      reason: 'Control',
      diagnosis: 'Herida sana',
      veterinarian: 'Dra. Sara Ruiz',
      notes: null,
      weight: 12.4,
      temperature: 38.6,
      heart_rate: 96,
      respiratory_rate: 22,
      mucous_membranes: 'ROSADAS',
      body_condition_score: 5,
      anamnesis: null,
      physical_exam: null,
      plan: null,
      appointment_id: null,
      veterinary_id: 'vet1',
      attended_by_employee_id: 'emp1',
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
    } as VisitRow;

    const dto = toVisitResponse(row);
    expect(dto).toMatchObject({
      id: 'v1',
      petId: 'p1',
      heartRate: 96,
      respiratoryRate: 22,
      mucousMembranes: 'ROSADAS',
      bodyConditionScore: 5,
      veterinaryId: 'vet1',
      attendedByEmployeeId: 'emp1',
    });
    expect(dto).not.toHaveProperty('heart_rate');
  });
});
