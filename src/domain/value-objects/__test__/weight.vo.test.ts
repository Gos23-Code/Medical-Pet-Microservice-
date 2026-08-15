import { describe, it, expect } from '@jest/globals';
import { Weight } from '../weight.vo';

describe('Weight Value Object', () => {
  describe('constructor', () => {
    it('debe crear un peso válido', () => {
      const weight = new Weight(5.5);
      expect(weight.value).toBe(5.5);
    });

    it('debe lanzar error si el peso es menor o igual a 0', () => {
      expect(() => new Weight(0)).toThrow('El peso debe estar entre 0 y 200 kg');
      expect(() => new Weight(-5)).toThrow('El peso debe estar entre 0 y 200 kg');
    });

    it('debe lanzar error si el peso es mayor o igual a 200', () => {
      expect(() => new Weight(200)).toThrow('El peso debe estar entre 0 y 200 kg');
      expect(() => new Weight(250)).toThrow('El peso debe estar entre 0 y 200 kg');
    });
  });
});