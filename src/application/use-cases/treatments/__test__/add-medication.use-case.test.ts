import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AddMedicationUseCase } from '../add-medication.use-case';
import { AddMedicationDTO } from '@/src/application/dtos/medication-treatment.dto';

describe('AddMedicationUseCase', () => {
  let addMedicationUseCase: AddMedicationUseCase;
  let mockSave: jest.Mock;

  beforeEach(() => {
    mockSave = jest.fn();
    
    const mockRepository = {
      save: mockSave,
      findById: jest.fn(),
      findByTreatmentId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    // Usar as never solo aquí para evitar el any
    addMedicationUseCase = new AddMedicationUseCase(mockRepository as never);
  });

  const validDto: AddMedicationDTO = {
    name: 'Amoxicilina',
    dosage: '500mg',
    frequency: 'Cada 12 horas',
    duration: '7 días',
  };

  const validTreatmentId = '123e4567-e89b-12d3-a456-426614174000';

  it('debe lanzar error si falta name', async () => {
    const invalidDto = { ...validDto, name: '' };
    await expect(addMedicationUseCase.execute(validTreatmentId, invalidDto))
      .rejects
      .toThrow('El nombre del medicamento es requerido');
  });

  it('debe lanzar error si falta dosage', async () => {
    const invalidDto = { ...validDto, dosage: '' };
    await expect(addMedicationUseCase.execute(validTreatmentId, invalidDto))
      .rejects
      .toThrow('La dosis es requerida');
  });

  it('debe lanzar error si falta frequency', async () => {
    const invalidDto = { ...validDto, frequency: '' };
    await expect(addMedicationUseCase.execute(validTreatmentId, invalidDto))
      .rejects
      .toThrow('La frecuencia es requerida');
  });

  it('debe lanzar error si falta duration', async () => {
    const invalidDto = { ...validDto, duration: '' };
    await expect(addMedicationUseCase.execute(validTreatmentId, invalidDto))
      .rejects
      .toThrow('La duración es requerida');
  });

  it('debe lanzar error si el ID del tratamiento es inválido', async () => {
    await expect(addMedicationUseCase.execute('', validDto))
      .rejects
      .toThrow('El ID del tratamiento es requerido');
  });
});