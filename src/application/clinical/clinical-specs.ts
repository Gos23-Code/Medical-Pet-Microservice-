// Campos nuevos por módulo, según las pantallas del mockup de historia clínica.
// Los campos que ya existían en el caso de uso original (nombre, dosis, fechas base…) siguen ahí.
// Estas especificaciones solo cubren lo que el mockup agrega.

import { FieldSpec } from './field-spec';

/** Cirugías: fecha y hora ("8:30 a. m."), riesgo ASA ("ASA I"). */
export const SURGERY_EXTRA_FIELDS: FieldSpec = {
  startsAt: { column: 'starts_at', type: 'datetime' },
  asaRisk: { column: 'asa_risk', type: 'int', min: 1, max: 5 },
};

/** Tratamientos: estado, indicaciones ("Secar bien entre los dedos…"), motivo de suspensión. */
export const TREATMENT_EXTRA_FIELDS: FieldSpec = {
  status: { column: 'status', type: 'enum', values: ['ACTIVO', 'FINALIZADO', 'SUSPENDIDO'] },
  instructions: { column: 'instructions', type: 'text', maxLength: 2000 },
  suspensionReason: { column: 'suspension_reason', type: 'text', maxLength: 500 },
};

/** Medicación: estado (Activo / Terminado / Reacción), desde–hasta, nota de reacción. */
export const MEDICATION_EXTRA_FIELDS: FieldSpec = {
  status: { column: 'status', type: 'enum', values: ['ACTIVO', 'TERMINADO', 'REACCION'] },
  startDate: { column: 'start_date', type: 'date' },
  endDate: { column: 'end_date', type: 'date' },
  reactionNote: { column: 'reaction_note', type: 'text', maxLength: 500 },
};

/** Laboratorio: laboratorio externo, estado global, interpretación del veterinario. */
export const LAB_EXTRA_FIELDS: FieldSpec = {
  laboratoryName: { column: 'laboratory_name', type: 'text', maxLength: 120 },
  status: { column: 'status', type: 'enum', values: ['NORMAL', 'FUERA_DE_RANGO', 'ANORMAL', 'NEGATIVO', 'POSITIVO'] },
  interpretation: { column: 'interpretation', type: 'text', maxLength: 2000 },
};

/** Una fila de la tabla de parámetros: "Parámetro · Resultado · Rango normal · Estado". */
export const LAB_RESULT_FIELDS: FieldSpec = {
  parameter: { column: 'parameter_name', type: 'text', maxLength: 120 },
  result: { column: 'result', type: 'text', maxLength: 60 },
  unit: { column: 'unit', type: 'text', maxLength: 20 },
  reference: { column: 'reference_text', type: 'text', maxLength: 60 },
  flag: { column: 'flag', type: 'enum', values: ['NORMAL', 'ALTO', 'BAJO', 'NEGATIVO', 'POSITIVO', 'ANORMAL'] },
};

/**
 * Vacunas: el carnet marca como "Anterior" la dosis que fue reemplazada.
 * Al crear una dosis con replacesVaccineId, la ruta marca la dosis anterior con replaced_by_id = nueva.
 * La columna replaces_vaccine_id NO existe: solo sirve para validar el UUID del body.
 */
export const VACCINE_EXTRA_FIELDS: FieldSpec = {
  replacesVaccineId: { column: 'replaces_vaccine_id', type: 'uuid' },
};

/** Peso: quién lo registró (dueño, veterinario, auxiliar). Lo fija el servidor, no el body. */
export const WEIGHT_REGISTRATION_COLUMNS = {
  userId: 'RegisteredByUserId',
  employeeId: 'RegisteredByEmployeeId',
  role: 'RegisteredByRole',
} as const;
