import { describe, it, expect } from '@jest/globals';
import { todayInTimeZone, DEFAULT_BUSINESS_TIME_ZONE } from '../business-date';

describe('todayInTimeZone', () => {
  it('usa America/Bogota por defecto', () => {
    expect(DEFAULT_BUSINESS_TIME_ZONE).toBe('America/Bogota');
  });

  it('de noche en Colombia no devuelve el día siguiente (UTC ya cambió de día)', () => {
    // 2026-10-15 02:00 UTC = 2026-10-14 21:00 en Bogotá (UTC-5)
    const now = new Date('2026-10-15T02:00:00Z');
    expect(todayInTimeZone('America/Bogota', now)).toBe('2026-10-14');
  });

  it('de día coincide con la fecha UTC', () => {
    const now = new Date('2026-10-15T15:00:00Z');
    expect(todayInTimeZone('America/Bogota', now)).toBe('2026-10-15');
  });

  it('respeta una zona distinta por clínica', () => {
    const now = new Date('2026-10-15T02:00:00Z');
    expect(todayInTimeZone('UTC', now)).toBe('2026-10-15');
  });

  it('devuelve formato YYYY-MM-DD', () => {
    expect(todayInTimeZone('America/Bogota', new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });
});
