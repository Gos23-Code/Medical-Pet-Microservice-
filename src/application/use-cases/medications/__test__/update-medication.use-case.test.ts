import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UpdateMedicationUseCase } from '../update-medication.use-case';
import { Medication } from '@/src/domain/entities/medication.entity';
import { Dosage } from '@/src/domain/value-objects/dosage.vo';
import { Frequency } from '@/src/domain/value-objects/frequency.vo';

describe('UpdateMedicationUseCase', () => {
  let updateMedicationUseCase: UpdateMedicationUseCase;
  let mockFindById: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    mockFindById = jest.fn();
    mockUpdate = jest.fn();
    
    const mockRepository = {
      findById: mockFindById,
      update: mockUpdate,
    };
    
    // @ts-expect-error - Ignorar tipo para mock
    updateMedicationUseCase = new UpdateMedicationUseCase(mockRepository);
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validCreatedAt = new Date('2024-01-01');
  const validUpdatedAt = new Date('2024-01-01');

  const mockMedication = Medication.reconstitute({
    id: validId,
    treatmentId: 'treatment-123',
    name: 'Amoxicilina',
    dosage: new Dosage('500mg'),
    frequency: new Frequency('Cada 12 horas'),
    duration: '7 días',
    createdAt: validCreatedAt,
    updatedAt: validUpdatedAt,
  });

  it('debe actualizar solo la dosis', async () => {
    // @ts-expect-error - Ignorar tipo para mock
    mockFindById.mockResolvedValue(mockMedication);
    // @ts-expect-error - Ignorar tipo para mock
    mockUpdate.mockResolvedValue(mockMedication);

    await updateMedicationUseCase.execute(validId, { dosage: '750mg' });

    expect(mockMedication.dosage.value).toBe('750mg');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('debe actualizar solo la frecuencia', async () => {
    // @ts-expect-error - Ignorar tipo para mock
    mockFindById.mockResolvedValue(mockMedication);
    // @ts-expect-error - Ignorar tipo para mock
    mockUpdate.mockResolvedValue(mockMedication);

    await updateMedicationUseCase.execute(validId, { frequency: 'Cada 8 horas' });

    expect(mockMedication.frequency.value).toBe('Cada 8 horas');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('debe actualizar dosis y frecuencia', async () => {
    // @ts-expect-error - Ignorar tipo para mock
    mockFindById.mockResolvedValue(mockMedication);
    // @ts-expect-error - Ignorar tipo para mock
    mockUpdate.mockResolvedValue(mockMedication);

    await updateMedicationUseCase.execute(validId, { 
      dosage: '750mg', 
      frequency: 'Cada 6 horas' 
    });

    expect(mockMedication.dosage.value).toBe('750mg');
    expect(mockMedication.frequency.value).toBe('Cada 6 horas');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar error si no existe', async () => {
    // @ts-expect-error - Ignorar tipo para mock
    mockFindById.mockResolvedValue(null);

    await expect(updateMedicationUseCase.execute(validId, { dosage: '750mg' }))
      .rejects
      .toThrow('Medicación no encontrada');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});