// Fecha de negocio: "hoy" en la zona horaria de la clínica.
// CONTRATOS_COMPARTIDOS.md §5: fechas en ISO UTC, zona de negocio por clínica (default America/Bogota).
// Usar toISOString() para "hoy" es un bug: de noche en Colombia cae en el día siguiente.

export const DEFAULT_BUSINESS_TIME_ZONE = 'America/Bogota';

/** Devuelve la fecha YYYY-MM-DD correspondiente a `now` en la zona indicada. */
export function todayInTimeZone(
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE,
  now: Date = new Date()
): string {
  // 'en-CA' formatea siempre como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
