// src/__tests__/domain/value-objects/next-dosage.vo.test.ts
import { NextDoseDate } from '../../value-objects/next-dosage.vo';

describe('NextDoseDate Value Object', () => {
  // ✅ Fechas relativas al momento actual
  const today = new Date();
  const appDate = new Date(today);
  appDate.setDate(appDate.getDate() - 30); // Aplicación: hace 30 días

  describe('create', () => {
    it('debe crear una próxima dosis válida', () => {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 180); // 180 días después
      
      const nextDate = NextDoseDate.create(futureDate, appDate);
      
      // ✅ Comparar partes de la fecha en lugar del objeto completo
      expect(nextDate.toDate()?.getFullYear()).toBe(futureDate.getFullYear());
      expect(nextDate.toDate()?.getMonth()).toBe(futureDate.getMonth());
      expect(nextDate.toDate()?.getDate()).toBe(futureDate.getDate());
    });

    // ... resto de las pruebas
  });
});