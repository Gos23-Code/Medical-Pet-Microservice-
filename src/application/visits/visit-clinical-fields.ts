// Campos clínicos de una visita ("Registrar visita", diseño 13 oct).
// Un solo conjunto de campos para el dueño y la clínica: todos son opcionales en el body.
// La clínica los escribe; el dueño los lee. Aquí solo se validan y se traducen a columnas.

export const MUCOUS_MEMBRANES = ['ROSADAS', 'PALIDAS', 'ICTERICAS', 'CIANOTICAS', 'HIPEREMICAS'] as const;

/** Nombre del body (camelCase) → columna de veterinary_visits (snake_case). */
export const VISIT_CLINICAL_COLUMNS = {
  weight: 'weight',
  temperature: 'temperature',
  heartRate: 'heart_rate',
  respiratoryRate: 'respiratory_rate',
  mucousMembranes: 'mucous_membranes',
  bodyConditionScore: 'body_condition_score',
  anamnesis: 'anamnesis',
  physicalExam: 'physical_exam',
  diagnosis: 'diagnosis',
  plan: 'plan',
  notes: 'notes',
  veterinarian: 'veterinarian',
} as const;

export type VisitClinicalKey = keyof typeof VISIT_CLINICAL_COLUMNS;

export type ParseResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; message: string };

function isBlankOrNull(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * Valida los campos clínicos que llegaron en el body y devuelve solo esos, ya con el nombre de columna.
 * Un campo ausente no se toca (sirve para PUT parcial). Un campo vacío explícito (null o "") se guarda como null.
 */
/** Campos que solo puede escribir la veterinaria. El dueño los ignora. */
export const CLINIC_ONLY_VISIT_FIELDS: readonly VisitClinicalKey[] = [
  'heartRate',
  'respiratoryRate',
  'mucousMembranes',
  'bodyConditionScore',
  'anamnesis',
  'physicalExam',
  'plan',
];

export function parseVisitClinicalFields(body: Record<string, unknown>, isClinic = true): ParseResult {
  const values: Record<string, unknown> = {};

  for (const key of Object.keys(VISIT_CLINICAL_COLUMNS) as VisitClinicalKey[]) {
    if (!(key in body)) continue;
    if (!isClinic && CLINIC_ONLY_VISIT_FIELDS.includes(key)) continue;
    const raw = body[key];
    const column = VISIT_CLINICAL_COLUMNS[key];

    if (isBlankOrNull(raw)) {
      values[column] = null;
      continue;
    }

    switch (key) {
      case 'weight': {
        const n = toNumber(raw);
        if (n === null || n <= 0 || n > 500) return { ok: false, message: 'weight debe ser un número mayor a 0' };
        values[column] = n;
        break;
      }
      case 'temperature': {
        const n = toNumber(raw);
        if (n === null || n < 30 || n > 45) return { ok: false, message: 'temperature debe estar entre 30 y 45 °C' };
        values[column] = n;
        break;
      }
      case 'heartRate':
      case 'respiratoryRate': {
        const n = toNumber(raw);
        const max = key === 'heartRate' ? 400 : 200;
        if (n === null || !Number.isInteger(n) || n < 1 || n > max) {
          return { ok: false, message: `${key} debe ser un entero entre 1 y ${max} lpm/rpm` };
        }
        values[column] = n;
        break;
      }
      case 'bodyConditionScore': {
        const n = toNumber(raw);
        if (n === null || !Number.isInteger(n) || n < 1 || n > 9) {
          return { ok: false, message: 'bodyConditionScore debe ser un entero entre 1 y 9' };
        }
        values[column] = n;
        break;
      }
      case 'mucousMembranes': {
        const code = String(raw).trim().toUpperCase();
        if (!(MUCOUS_MEMBRANES as readonly string[]).includes(code)) {
          return { ok: false, message: `mucousMembranes debe ser uno de: ${MUCOUS_MEMBRANES.join(', ')}` };
        }
        values[column] = code;
        break;
      }
      default:
        values[column] = String(raw);
    }
  }

  return { ok: true, values };
}
