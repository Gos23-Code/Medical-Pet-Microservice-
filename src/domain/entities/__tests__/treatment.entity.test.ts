import { describe, it, expect } from '@jest/globals';
import { Treatment } from '../treatment.entity';

describe('Treatment Entity', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validVisitId = '987e6543-e21b-12d3-a456-426614174000';
  const validDescription = 'Tratamiento para infección respiratoria';
  const validStartDate = new Date('2024-01-01');
  const validEndDate = new Date('2024-01-15');
  const validNotes = 'Tomar medicamento cada 12 horas';

  describe('create', () => {
    it('debe crear un tratamiento exitosamente con todos los campos', () => {
      const treatment = Treatment.create({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate,
        endDate: validEndDate,
        notes: validNotes,
      });

      expect(treatment).toBeDefined();
      expect(treatment.id).toBe(validId);
      expect(treatment.visitId).toBe(validVisitId);
      expect(treatment.description).toBe(validDescription);
      expect(treatment.startDate).toEqual(validStartDate);
      expect(treatment.endDate).toEqual(validEndDate);
      expect(treatment.notes).toBe(validNotes);
      expect(treatment.createdAt).toBeDefined();
      expect(treatment.updatedAt).toBeDefined();
    });

    it('debe crear un tratamiento sin fecha de fin y sin notas', () => {
      const treatment = Treatment.create({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate,
        endDate: null,
        notes: null,
      });

      expect(treatment.endDate).toBeNull();
      expect(treatment.notes).toBeNull();
    });
  });

  describe('reconstitute', () => {
    it('debe reconstituir un tratamiento existente', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const treatment = Treatment.reconstitute({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate,
        endDate: validEndDate,
        notes: validNotes,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });

      expect(treatment.id).toBe(validId);
      expect(treatment.createdAt).toBe(createdAt);
      expect(treatment.updatedAt).toBe(updatedAt);
    });
  });

  describe('toJSON', () => {
    it('debe retornar la representación JSON correcta con todas las propiedades', () => {
      const treatment = Treatment.create({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate,
        endDate: validEndDate,
        notes: validNotes,
      });

      const json = treatment.toJSON();

      expect(json).toEqual({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate.toISOString().split('T')[0],
        endDate: validEndDate.toISOString().split('T')[0],
        notes: validNotes,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('debe retornar JSON con fechas correctas cuando endDate es null', () => {
      const treatment = Treatment.create({
        id: validId,
        visitId: validVisitId,
        description: validDescription,
        startDate: validStartDate,
        endDate: null,
        notes: null,
      });

      const json = treatment.toJSON();

      expect(json.endDate).toBeNull();
      expect(json.notes).toBeNull();
    });
  });
});