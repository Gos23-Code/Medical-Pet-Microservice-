import { describe, it, expect } from '@jest/globals';
import { Medication } from '../medicacion-treatment.entity';
import { Dosage } from '../../value-objects/dosage.vo';
import { Frequency } from '../../value-objects/frequency.vo';

describe('Medication Entity', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validTreatmentId = '987e6543-e21b-12d3-a456-426614174000';
  const validName = 'Amoxicilina';
  const validDosage = '500mg';
  const validFrequency = 'Cada 12 horas';
  const validDuration = '7 días';

  describe('create', () => {
    it('debe crear una medicación exitosamente con todos los campos', () => {
      const medication = Medication.create({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
      });

      expect(medication).toBeDefined();
      expect(medication.id).toBe(validId);
      expect(medication.treatmentId).toBe(validTreatmentId);
      expect(medication.name).toBe(validName);
      expect(medication.dosage.value).toBe(validDosage);
      expect(medication.frequency.value).toBe(validFrequency);
      expect(medication.duration).toBe(validDuration);
      expect(medication.createdAt).toBeDefined();
    });
  });

  describe('reconstitute', () => {
    it('debe reconstituir una medicación existente', () => {
      const createdAt = new Date('2024-01-01');

      const medication = Medication.reconstitute({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
        createdAt: createdAt,
      });

      expect(medication.id).toBe(validId);
      expect(medication.createdAt).toBe(createdAt);
    });
  });

  describe('toJSON', () => {
    it('debe retornar la representación JSON correcta', () => {
      const medication = Medication.create({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: new Dosage(validDosage),
        frequency: new Frequency(validFrequency),
        duration: validDuration,
      });

      const json = medication.toJSON();

      expect(json).toEqual({
        id: validId,
        treatmentId: validTreatmentId,
        name: validName,
        dosage: validDosage,
        frequency: validFrequency,
        duration: validDuration,
        createdAt: expect.any(String),
      });
    });
  });
});