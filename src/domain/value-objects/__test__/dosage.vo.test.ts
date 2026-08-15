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

    it('debe lanzar error si la dosis es undefined', () => {
      expect(() => new Dosage(undefined as unknown as string)).toThrow('La dosis no puede estar vacía');
    });

    it('debe lanzar error si la dosis es null', () => {
      expect(() => new Dosage(null as unknown as string)).toThrow('La dosis no puede estar vacía');
    });
  });

  describe('get value', () => {
    it('debe retornar el valor de la dosis', () => {
      const dosage = new Dosage('500mg');
      expect(dosage.value).toBe('500mg');
    });

    it('debe retornar el valor sin espacios', () => {
      const dosage = new Dosage('  750mg  ');
      expect(dosage.value).toBe('750mg');
    });
  });
});