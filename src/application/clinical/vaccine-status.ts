// Estado que muestra el carnet de vacunas (mockup, pestaña Vacunas).
// Es calculado: la base guarda fechas y el reemplazo; el texto "Vigente / Por vencer / Vencida / Anterior" sale de aquí.

export type VaccineDisplayStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'ANTERIOR' | 'SIN_PROXIMA_DOSIS';

/** Días antes del vencimiento en que la vacuna pasa a "Por vencer" (el mockup muestra "Vence el 18 nov"). */
export const POR_VENCER_DAYS = 30;

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * @param today fecha de hoy en la zona de la clínica (YYYY-MM-DD, ver todayInTimeZone)
 */
export function vaccineDisplayStatus(
  row: { next_dose_date: string | null; replaced_by_id: string | null },
  today: string
): VaccineDisplayStatus {
  if (row.replaced_by_id) return 'ANTERIOR';
  if (!row.next_dose_date) return 'SIN_PROXIMA_DOSIS';

  const days = daysBetween(today, row.next_dose_date);
  if (days < 0) return 'VENCIDA';
  if (days <= POR_VENCER_DAYS) return 'POR_VENCER';
  return 'VIGENTE';
}
