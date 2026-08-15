// src/__tests__/domain/value-objects/vaccine-name.vo.test.ts
import { VaccineName } from '../../../domain/value-objects/vaccine-name.vo';

describe('VaccineName Value Object', () => {
  describe('create', () => {
    it('debe crear un nombre de vacuna válido', () => {
      const name = VaccineName.create('Rabia');
      expect(name.value).toBe('Rabia');
    });

    it('debe normalizar el nombre (trim y espacios)', () => {
      const name = VaccineName.create('  Rabia   Triple  ');
      expect(name.value).toBe('Rabia Triple');
    });

    it('debe lanzar error si el nombre está vacío', () => {
      expect(() => VaccineName.create('')).toThrow('El nombre de la vacuna es requerido');
      expect(() => VaccineName.create('   ')).toThrow('El nombre de la vacuna es requerido');
      expect(() => VaccineName.create('  ')).toThrow('El nombre de la vacuna es requerido');
    });

    it('debe lanzar error si el nombre es muy largo', () => {
      const longName = 'a'.repeat(101);
      expect(() => VaccineName.create(longName)).toThrow(
        'El nombre de la vacuna no puede exceder los 100 caracteres'
      );
    });

    it('debe permitir nombres con exactamente 100 caracteres', () => {
      const longName = 'a'.repeat(100);
      const name = VaccineName.create(longName);
      expect(name.value).toBe(longName);
    });
  });

  describe('equals', () => {
    it('debe comparar dos nombres correctamente', () => {
      const name1 = VaccineName.create('Rabia');
      const name2 = VaccineName.create('Rabia');
      const name3 = VaccineName.create('Moquillo');

      expect(name1.equals(name2)).toBe(true);
      expect(name1.equals(name3)).toBe(false);
    });
  });
});