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

    it('debe lanzar error si la frecuencia es undefined', () => {
      expect(() => new Frequency(undefined as unknown as string)).toThrow('La frecuencia no puede estar vacía');
    });

    it('debe lanzar error si la frecuencia es null', () => {
      expect(() => new Frequency(null as unknown as string)).toThrow('La frecuencia no puede estar vacía');
    });
  });

  describe('get value', () => {
    it('debe retornar el valor de la frecuencia', () => {
      const frequency = new Frequency('Cada 12 horas');
      expect(frequency.value).toBe('Cada 12 horas');
    });

    it('debe retornar el valor sin espacios', () => {
      const frequency = new Frequency('  Cada 6 horas  ');
      expect(frequency.value).toBe('Cada 6 horas');
    });
  });
}); 