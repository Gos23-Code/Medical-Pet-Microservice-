import { FieldSpec, ParseFieldsResult, parseFields } from './field-spec';

// Regla de los dos tipos de body:
//   • Dueño (token USER): usa los campos base, los de siempre. Los campos extra del mockup se ignoran.
//   • Veterinaria (token VETERINARY): base + campos extra opcionales.
// La decisión la toma la ruta con `isClinic = !!actor.clinic`. Nunca viene del body.

export function parseClinicExtras(
  isClinic: boolean,
  body: Record<string, unknown>,
  spec: FieldSpec
): ParseFieldsResult {
  if (!isClinic) return { ok: true, values: {} };
  return parseFields(body, spec);
}
