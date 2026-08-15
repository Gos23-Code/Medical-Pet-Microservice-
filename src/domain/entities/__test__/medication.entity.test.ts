import { describe, it, expect } from '@jest/globals';
import { Medication } from '../medication.entity';
import { Dosage } from '../../value-objects/dosage.vo';
import { Frequency } from '../../value-objects/frequency.vo';

describe('Medication Entity', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validTreatmentId = '987e6543-e21b-12d3-a456-426614174000';
  const validName = 'Amoxicilina';
  const validDosage = '500mg';
  const validFrequency = 'Cada 12 horas';
  const validDuration = '7 días';
  const validCreatedAt = new Date('2024-01-01');
  const validUpdatedAt = new Date('2024-01-01'); // Mismo valor que createdAt

  describe('reconstitute', () => {
    it('debe reconstituir una medicación existente', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(medication.id).toBe(validId);
      expect(medication.treatmentId).toBe(validTreatmentId);
      expect(medication.name).toBe(validName);
      expect(medication.dosage.value).toBe(validDosage);
      expect(medication.frequency.value).toBe(validFrequency);
      expect(medication.duration).toBe(validDuration);
      expect(medication.createdAt).toBe(validCreatedAt);
      expect(medication.updatedAt).toBe(validUpdatedAt);
    });
  });

  describe('updateDosage', () => {
    it('debe actualizar la dosis correctamente', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage('500mg'),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const originalUpdatedAt = medication.updatedAt;
      
      medication.updateDosage('750mg');

      expect(medication.dosage.value).toBe('750mg');
      expect(medication.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('debe lanzar error si la nueva dosis está vacía', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage('500mg'),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(() => medication.updateDosage('')).toThrow('La dosis no puede estar vacía');
    });
  });

  describe('updateFrequency', () => {
    it('debe actualizar la frecuencia correctamente', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency('Cada 12 horas'),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const originalUpdatedAt = medication.updatedAt;
      
      medication.updateFrequency('Cada 8 horas');

      expect(medication.frequency.value).toBe('Cada 8 horas');
      expect(medication.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('debe lanzar error si la nueva frecuencia está vacía', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency('Cada 12 horas'),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(() => medication.updateFrequency('')).toThrow('La frecuencia no puede estar vacía');
    });
  });

  describe('toJSON', () => {
    it('debe retornar la representación JSON correcta', () => {
      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const json = medication.toJSON();

      expect(json).toEqual({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: validDosage,
        frequency: validFrequency,
        duration: validDuration,
        createdAt: validCreatedAt.toISOString(),
        updatedAt: validUpdatedAt.toISOString(),
      });
    });
  });
});