import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetTreatmentUseCase } from '../get-treatment.use-case';
import { Treatment } from '@/src/domain/entities/treatment.entity';

describe('GetTreatmentUseCase', () => {
  let getTreatmentUseCase: GetTreatmentUseCase;
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
    getTreatmentUseCase = new GetTreatmentUseCase(mockRepository);
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const createMockTreatment = () => {
    return Treatment.create({
      id: validId,
      visitId: 'visit-123',
      description: 'Tratamiento de prueba',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      notes: 'Notas del tratamiento',
    });
  };

  describe('execute', () => {
    it('debe obtener un tratamiento exitosamente por ID', async () => {
      const mockTreatment = createMockTreatment();
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(mockTreatment);

      const result = await getTreatmentUseCase.execute(validId);

      expect(result).toBeDefined();
      expect(result.id).toBe(validId);
      expect(result.description).toBe('Tratamiento de prueba');
      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(mockFindById).toHaveBeenCalledTimes(1);
    });

    it('debe retornar un tratamiento sin fecha de fin', async () => {
      const treatmentWithoutEndDate = Treatment.create({
        id: validId,
        visitId: 'visit-123',
        description: 'Tratamiento sin fecha de fin',
        startDate: new Date('2024-01-01'),
        endDate: null,
        notes: null,
      });
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatmentWithoutEndDate);

      const result = await getTreatmentUseCase.execute(validId);

      expect(result.endDate).toBeNull();
      expect(result.isActive()).toBe(true);
    });

    it('debe lanzar error si el tratamiento no existe', async () => {
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(null);

      await expect(getTreatmentUseCase.execute(validId))
        .rejects
        .toThrow('Tratamiento no encontrado');
      expect(mockFindById).toHaveBeenCalledWith(validId);
    });

    it('debe lanzar error si el ID es inválido', async () => {
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(null);

      await expect(getTreatmentUseCase.execute('id-invalido'))
        .rejects
        .toThrow('Tratamiento no encontrado');
    });

    it('debe obtener un tratamiento con todas sus propiedades', async () => {
      const mockTreatment = createMockTreatment();
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(mockTreatment);

      const result = await getTreatmentUseCase.execute(validId);

      expect(result).toMatchObject({
        id: validId,
        visitId: 'visit-123',
        description: 'Tratamiento de prueba',
        notes: 'Notas del tratamiento',
      });
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
});