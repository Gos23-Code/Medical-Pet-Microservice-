import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UpdateTreatmentUseCase } from '../update-treatment.use-case';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { UpdateTreatmentDTO } from '../../dtos/treatment.dto';

describe('UpdateTreatmentUseCase', () => {
  let updateTreatmentUseCase: UpdateTreatmentUseCase;
  let mockFindById: jest.Mock;
  let mockSave: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    mockFindById = jest.fn();
    mockSave = jest.fn();
    mockUpdate = jest.fn();
    
    const mockRepository = {
      findById: mockFindById,
      save: mockSave,
      update: mockUpdate,
    };
    
    // @ts-expect-error - Mock para pruebas
    updateTreatmentUseCase = new UpdateTreatmentUseCase(mockRepository);
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const createTreatment = () => {
    return Treatment.create({
      id: validId,
      visitId: 'visit-123',
      description: 'Tratamiento de prueba',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      notes: 'Notas originales',
    });
  };

  describe('execute', () => {
    it('debe actualizar solo la fecha de inicio', async () => {
      const treatment = createTreatment();
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);
      // @ts-expect-error - Mock para pruebas
      mockUpdate.mockResolvedValue(treatment);

      const dto: UpdateTreatmentDTO = { startDate: '2024-02-01' };
      await updateTreatmentUseCase.execute(validId, dto);

      expect(treatment.startDate).toEqual(new Date('2024-02-01'));
      expect(treatment.endDate).toEqual(new Date('2024-01-15'));
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('debe actualizar solo la fecha de fin', async () => {
      const treatment = createTreatment();
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);
      // @ts-expect-error - Mock para pruebas
      mockUpdate.mockResolvedValue(treatment);

      const dto: UpdateTreatmentDTO = { endDate: '2024-02-15' };
      await updateTreatmentUseCase.execute(validId, dto);

      expect(treatment.startDate).toEqual(new Date('2024-01-01'));
      expect(treatment.endDate).toEqual(new Date('2024-02-15'));
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('debe actualizar ambas fechas', async () => {
      const treatment = createTreatment();
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);
      // @ts-expect-error - Mock para pruebas
      mockUpdate.mockResolvedValue(treatment);

      const dto: UpdateTreatmentDTO = { startDate: '2024-02-01', endDate: '2024-02-28' };
      await updateTreatmentUseCase.execute(validId, dto);

      expect(treatment.startDate).toEqual(new Date('2024-02-01'));
      expect(treatment.endDate).toEqual(new Date('2024-02-28'));
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar error si el tratamiento no existe', async () => {
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(null);

      await expect(updateTreatmentUseCase.execute(validId, {}))
        .rejects
        .toThrow('Tratamiento no encontrado');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});