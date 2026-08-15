// src/__tests__/domain/entities/vaccine.entity.test.ts
import { Vaccine } from '../../../domain/entities/vaccine.entity';

describe('Vaccine Entity', () => {
  const mockData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    petId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Rabia',
    lotNumber: 'LOT-2024-001',
    applicationDate: new Date('2024-01-15'),
    nextDoseDate: new Date('2025-01-15'),
    veterinarian: 'Dr. Pérez',
    notes: 'Primera dosis anual',
    createdAt: new Date('2024-01-15T10:00:00Z')
  };

  describe('create', () => {
    it('debe crear una vacuna válida', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        mockData.nextDoseDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.id).toBe(mockData.id);
      expect(vaccine.petId).toBe(mockData.petId);
      expect(vaccine.nameValue).toBe('Rabia');
      expect(vaccine.lotNumber).toBe('LOT-2024-001');
      expect(vaccine.veterinarian).toBe('Dr. Pérez');
      expect(vaccine.notes).toBe('Primera dosis anual');
    });

    it('debe crear una vacuna sin próxima dosis', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        null,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.nextDoseDateValue).toBeNull();
    });

    it('debe lanzar error si el nombre es inválido', () => {
      expect(() => {
        Vaccine.create(
          mockData.id,
          mockData.petId,
          '',
          mockData.lotNumber,
          mockData.applicationDate,
          mockData.nextDoseDate,
          mockData.veterinarian,
          mockData.notes,
          mockData.createdAt
        );
      }).toThrow('El nombre de la vacuna es requerido');
    });
  });

  describe('isDue', () => {
    it('debe retornar false si la vacuna no está vencida', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        futureDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.isDue()).toBe(false);
    });

    it('debe retornar true si la vacuna está vencida', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        pastDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.isDue()).toBe(true);
    });

    it('debe retornar false si no hay próxima dosis', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        null,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.isDue()).toBe(false);
    });
  });

  describe('daysUntilDue', () => {
    it('debe calcular los días hasta el vencimiento', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        futureDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.daysUntilDue()).toBe(30);
    });

    it('debe retornar null si no hay próxima dosis', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        null,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      expect(vaccine.daysUntilDue()).toBeNull();
    });
  });

  describe('updateInfo', () => {
    it('debe actualizar la información de la vacuna', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        mockData.nextDoseDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      const updated = vaccine.updateInfo({
        name: 'Rabia (Refuerzo)',
        lotNumber: 'LOT-2024-002',
        veterinarian: 'Dra. Gómez'
      });

      expect(updated.nameValue).toBe('Rabia (Refuerzo)');
      expect(updated.lotNumber).toBe('LOT-2024-002');
      expect(updated.veterinarian).toBe('Dra. Gómez');
      // Los campos que no se actualizan mantienen su valor
      expect(updated.petId).toBe(mockData.petId);
      expect(updated.notes).toBe(mockData.notes);
    });

    it('debe actualizar la próxima dosis', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        mockData.nextDoseDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      const newDate = new Date('2026-01-15');
      const updated = vaccine.updateInfo({
        nextDoseDate: newDate
      });

      expect(updated.nextDoseDateValue).toEqual(newDate);
    });

    it('debe lanzar error si la próxima dosis es anterior a la aplicación', () => {
      const vaccine = Vaccine.create(
        mockData.id,
        mockData.petId,
        mockData.name,
        mockData.lotNumber,
        mockData.applicationDate,
        mockData.nextDoseDate,
        mockData.veterinarian,
        mockData.notes,
        mockData.createdAt
      );

      const invalidDate = new Date('2024-01-14');
      expect(() => {
        vaccine.updateInfo({
          nextDoseDate: invalidDate
        });
      }).toThrow('La próxima dosis debe ser posterior a la fecha de aplicación');
    });
  });
});