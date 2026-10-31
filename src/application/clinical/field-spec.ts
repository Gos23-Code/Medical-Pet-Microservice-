// Especificación declarativa de campos clínicos: body (camelCase) ↔ columna (snake_case).
// Cada módulo (cirugías, tratamientos, medicación, laboratorio, vacunas) declara sus campos nuevos
// con esta función. Un solo lugar valida rangos, fechas y enums; los módulos no repiten esa lógica.

export type FieldDef =
  | { column: string; type: 'text'; maxLength?: number }
  | { column: string; type: 'int'; min: number; max: number }
  | { column: string; type: 'number'; min: number; max: number }
  | { column: string; type: 'date' }
  | { column: string; type: 'datetime' }
  | { column: string; type: 'enum'; values: readonly string[] }
  | { column: string; type: 'uuid' };

export type FieldSpec = Record<string, FieldDef>;

export type ParseFieldsResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * Valida los campos de `spec` que llegaron en `body`. Un campo ausente no se toca (sirve para PATCH).
 * Un campo vacío explícito (null o "") se guarda como null.
 */
export function parseFields(body: Record<string, unknown>, spec: FieldSpec): ParseFieldsResult {
  const values: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(spec)) {
    if (!(key in body)) continue;
    const raw = body[key];

    if (isBlank(raw)) {
      values[def.column] = null;
      continue;
    }

    switch (def.type) {
      case 'text': {
        const text = String(raw);
        if (def.maxLength && text.length > def.maxLength) {
          return { ok: false, message: `${key} no puede tener más de ${def.maxLength} caracteres` };
        }
        values[def.column] = text;
        break;
      }
      case 'int': {
        const n = toNumber(raw);
        if (n === null || !Number.isInteger(n) || n < def.min || n > def.max) {
          return { ok: false, message: `${key} debe ser un entero entre ${def.min} y ${def.max}` };
        }
        values[def.column] = n;
        break;
      }
      case 'number': {
        const n = toNumber(raw);
        if (n === null || n < def.min || n > def.max) {
          return { ok: false, message: `${key} debe estar entre ${def.min} y ${def.max}` };
        }
        values[def.column] = n;
        break;
      }
      case 'date': {
        const text = String(raw);
        if (!DATE_RE.test(text) || Number.isNaN(Date.parse(text))) {
          return { ok: false, message: `${key} debe tener formato YYYY-MM-DD` };
        }
        values[def.column] = text;
        break;
      }
      case 'datetime': {
        const time = Date.parse(String(raw));
        if (Number.isNaN(time)) {
          return { ok: false, message: `${key} debe ser una fecha y hora ISO-8601` };
        }
        values[def.column] = new Date(time).toISOString();
        break;
      }
      case 'enum': {
        const code = String(raw).trim().toUpperCase();
        if (!def.values.includes(code)) {
          return { ok: false, message: `${key} debe ser uno de: ${def.values.join(', ')}` };
        }
        values[def.column] = code;
        break;
      }
      case 'uuid': {
        const id = String(raw).trim();
        if (!UUID_RE.test(id)) {
          return { ok: false, message: `${key} debe ser un UUID` };
        }
        values[def.column] = id;
        break;
      }
    }
  }

  return { ok: true, values };
}

/** Convierte una fila de la base en el formato de respuesta (camelCase). Columnas ausentes → null. */
export function toResponse(row: Record<string, unknown>, spec: FieldSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(spec)) {
    out[key] = row[def.column] ?? null;
  }
  return out;
}
