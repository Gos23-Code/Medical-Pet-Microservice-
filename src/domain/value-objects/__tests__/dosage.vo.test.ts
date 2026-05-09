import { describe, it, expect } from '@jest/globals';
import { Dosage } from '../dosage.vo';

describe('Dosage Value Object', () => {
  describe('constructor', () => {
    it('debe crear una dosis válida', () => {
      const dosage = new Dosage('500mg');
      expect(dosage.value).toBe('500mg');
    });

    it('debe crear una dosis con espacios y recortarlos', () => {
      const dosage = new Dosage('  500mg  ');
      expect(dosage.value).toBe('500mg');
    });

    it('debe lanzar error si la dosis está vacía', () => {
      expect(() => new Dosage('')).toThrow('La dosis no puede estar vacía');
    });

    it('debe lanzar error si la dosis es solo espacios', () => {
      expect(() => new Dosage('   ')).toThrow('La dosis no puede estar vacía');
    });
  });

  describe('equals', () => {
    it('debe retornar true cuando dos dosis son iguales', () => {
      const dosage1 = new Dosage('500mg');
      const dosage2 = new Dosage('500mg');
      expect(dosage1.equals(dosage2)).toBe(true);
    });

    it('debe retornar false cuando dos dosis son diferentes', () => {
      const dosage1 = new Dosage('500mg');
      const dosage2 = new Dosage('750mg');
      expect(dosage1.equals(dosage2)).toBe(false);
    });
  });
});