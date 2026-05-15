import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IsActiveUseCase } from '../is-active.use-case';
import { Treatment } from '@/src/domain/entities/treatment.entity';

describe('IsActiveUseCase', () => {
  let isActiveUseCase: IsActiveUseCase;
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
    isActiveUseCase = new IsActiveUseCase(mockRepository);
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const createTreatment = (startDate: Date, endDate: Date | null, description: string) => {
    return Treatment.create({
      id: validId,
      visitId: 'visit-123',
      description: description,
      startDate: startDate,
      endDate: endDate,
      notes: null,
    });
  };

  describe('execute', () => {
    it('debe retornar activo si no tiene fecha de fin', async () => {
      const treatment = createTreatment(new Date('2024-01-01'), null, 'Tratamiento crónico');
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);

      const result = await isActiveUseCase.execute(validId);

      expect(result.isActive).toBe(true);
      expect(result.status).toBe('ACTIVE_INDEFINITE');
      expect(result.message).toContain('sin fecha de vencimiento');
    });

    it('debe retornar activo si la fecha de fin es futura', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const treatment = createTreatment(new Date('2024-01-01'), futureDate, 'Tratamiento activo');
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);

      const result = await isActiveUseCase.execute(validId);

      expect(result.isActive).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.message).toContain('activo');
      expect(result.message).toContain('días'); // Simplificado: solo verifica que contenga "días"
    });

    it('debe retornar activo último día si la fecha de fin es hoy', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const treatment = createTreatment(new Date('2024-01-01'), today, 'Tratamiento que vence hoy');
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);

      const result = await isActiveUseCase.execute(validId);

      expect(result.isActive).toBe(true);
      expect(result.status).toBe('ACTIVE_LAST_DAY');
      expect(result.message).toContain('vence HOY');
    });

    it('debe retornar expirado si la fecha de fin ya pasó', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const treatment = createTreatment(new Date('2024-01-01'), pastDate, 'Tratamiento expirado');
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(treatment);

      const result = await isActiveUseCase.execute(validId);

      expect(result.isActive).toBe(false);
      expect(result.status).toBe('EXPIRED');
      expect(result.message).toContain('expiró');
    });

    it('debe lanzar error si el tratamiento no existe', async () => {
      // @ts-expect-error - Mock para pruebas
      mockFindById.mockResolvedValue(null);

      await expect(isActiveUseCase.execute(validId)).rejects.toThrow('Tratamiento no encontrado');
    });
  });
});