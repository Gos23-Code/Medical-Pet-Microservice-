import { describe, it, expect } from '@jest/globals';
import { Frequency } from '../frequency.vo';

describe('Frequency Value Object', () => {
  describe('constructor', () => {
    it('debe crear una frecuencia válida', () => {
      const frequency = new Frequency('Cada 12 horas');
      expect(frequency.value).toBe('Cada 12 horas');
    });

    it('debe crear una frecuencia con espacios y recortarlos', () => {
      const frequency = new Frequency('  Cada 8 horas  ');
      expect(frequency.value).toBe('Cada 8 horas');
    });

    it('debe lanzar error si la frecuencia está vacía', () => {
      expect(() => new Frequency('')).toThrow('La frecuencia no puede estar vacía');
    });

    it('debe lanzar error si la frecuencia es solo espacios', () => {
      expect(() => new Frequency('   ')).toThrow('La frecuencia no puede estar vacía');
    });
  });

  describe('equals', () => {
    it('debe retornar true cuando dos frecuencias son iguales', () => {
      const frequency1 = new Frequency('Cada 12 horas');
      const frequency2 = new Frequency('Cada 12 horas');
      expect(frequency1.equals(frequency2)).toBe(true);
    });

    it('debe retornar false cuando dos frecuencias son diferentes', () => {
      const frequency1 = new Frequency('Cada 12 horas');
      const frequency2 = new Frequency('Cada 8 horas');
      expect(frequency1.equals(frequency2)).toBe(false);
    });
  });
});  