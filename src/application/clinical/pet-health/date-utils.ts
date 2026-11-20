import { ApiError } from '@/src/infrastructure/http/api-error';

// Fechas YYYY-MM-DD sin hora. Se comparan como texto (orden lexicográfico = orden cronológico).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** true si es una fecha YYYY-MM-DD real (rechaza 2026-02-31). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function requireIsoDate(value: unknown, field: string): string {
  if (!isIsoDate(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} debe ser una fecha YYYY-MM-DD válida`);
  }
  return value;
}
