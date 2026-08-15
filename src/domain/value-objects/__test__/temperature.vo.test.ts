import { describe, it, expect } from '@jest/globals';
import { Temperature } from '../temperature.vo';

describe('Temperature Value Object', () => {
  describe('constructor', () => {
    it('debe crear una temperatura válida', () => {
      const temperature = new Temperature(38.5);
      expect(temperature.value).toBe(38.5);
    });

    it('debe lanzar error si la temperatura es menor a 35°C', () => {
      expect(() => new Temperature(34)).toThrow('La temperatura debe estar entre 35°C y 42°C');
    });

    it('debe lanzar error si la temperatura es mayor a 42°C', () => {
      expect(() => new Temperature(43)).toThrow('La temperatura debe estar entre 35°C y 42°C');
    });
  });
});