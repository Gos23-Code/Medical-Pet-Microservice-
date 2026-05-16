import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UpdateVisitUseCase } from '../update-visit.use-case';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { UpdateVisitDTO } from '../../dtos/veterinary-visit.dto';

describe('UpdateVisitUseCase', () => {
  let updateVisitUseCase: UpdateVisitUseCase;
  let mockFindById: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    mockFindById = jest.fn();
    mockUpdate = jest.fn();

    const mockRepository = {
      save: jest.fn(),
      findById: mockFindById,
      findByPetId: jest.fn(),
      findByDateRange: jest.fn(),
      update: mockUpdate,
      delete: jest.fn(),
    };

    // @ts-expect-error - Mock para pruebas
    updateVisitUseCase = new UpdateVisitUseCase(mockRepository);
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';

  const createMockVisit = () => {
    return VeterinaryVisit.create({
      id: validId,
      petId: 'pet-123',
      date: new Date('2024-01-01'),
      reason: 'Consulta original',
      veterinarian: 'Dr. Original',
      diagnosis: 'Diagnóstico original',
      notes: 'Notas originales',
      weight: undefined,
      temperature: undefined,
    });
  };

  it('debe actualizar el diagnóstico', async () => {
    const mockVisit = createMockVisit();
    // @ts-expect-error - Mock para pruebas
    mockFindById.mockResolvedValue(mockVisit);
    // @ts-expect-error - Mock para pruebas
    mockUpdate.mockResolvedValue(mockVisit);

    const dto: UpdateVisitDTO = { diagnosis: 'Nuevo diagnóstico' };
    await updateVisitUseCase.execute(validId, dto);

    expect(mockVisit.diagnosis).toBe('Nuevo diagnóstico');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('debe actualizar las notas', async () => {
    const mockVisit = createMockVisit();
    // @ts-expect-error - Mock para pruebas
    mockFindById.mockResolvedValue(mockVisit);
    // @ts-expect-error - Mock para pruebas
    mockUpdate.mockResolvedValue(mockVisit);

    const dto: UpdateVisitDTO = { notes: 'Notas actualizadas' };
    await updateVisitUseCase.execute(validId, dto);

    expect(mockVisit.notes).toBe('Notas actualizadas');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar error si la visita no existe', async () => {
    // @ts-expect-error - Mock para pruebas
    mockFindById.mockResolvedValue(null);

    await expect(updateVisitUseCase.execute(validId, { diagnosis: 'Nuevo' }))
      .rejects
      .toThrow('Visita no encontrada');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});