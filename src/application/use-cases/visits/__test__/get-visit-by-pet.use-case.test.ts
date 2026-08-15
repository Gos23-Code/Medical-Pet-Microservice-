import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetVisitsByPetUseCase } from '@/src/application/use-cases/visits/get-visit-by-pet.use-case';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';

describe('GetVisitsByPetUseCase', () => {
  let getVisitsByPetUseCase: GetVisitsByPetUseCase;
  let mockFindByPetId: jest.Mock;

  beforeEach(() => {
    mockFindByPetId = jest.fn();

    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByPetId: mockFindByPetId,
      findByDateRange: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // @ts-expect-error - Mock para pruebas
    getVisitsByPetUseCase = new GetVisitsByPetUseCase(mockRepository);
  });

  const validPetId = '123e4567-e89b-12d3-a456-426614174000';

  it('debe retornar visitas de una mascota exitosamente', async () => {
    const mockVisits = [
      VeterinaryVisit.create({
        id: '1',
        petId: validPetId,
        date: new Date('2024-01-01'),
        reason: 'Consulta general',
        veterinarian: 'Dr. Juan Pérez',
        diagnosis: 'Saludable',
        notes: 'Control anual',
        weight: undefined,
        temperature: undefined,
      }),
      VeterinaryVisit.create({
        id: '2',
        petId: validPetId,
        date: new Date('2024-02-01'),
        reason: 'Vacunación',
        veterinarian: 'Dra. María González',
        diagnosis: 'Vacunas al día',
        notes: 'Se aplicó vacuna triple',
        weight: undefined,
        temperature: undefined,
      }),
    ];
    // @ts-expect-error - Mock para pruebas
    mockFindByPetId.mockResolvedValue(mockVisits);

    const result = await getVisitsByPetUseCase.execute(validPetId);

    expect(result).toHaveLength(2);
    expect(result[0].petId).toBe(validPetId);
    expect(result[0].reason).toBe('Consulta general');
    expect(result[1].reason).toBe('Vacunación');
    expect(mockFindByPetId).toHaveBeenCalledWith(validPetId);
    expect(mockFindByPetId).toHaveBeenCalledTimes(1);
  });

  it('debe retornar array vacío si la mascota no tiene visitas', async () => {
    // @ts-expect-error - Mock para pruebas
    mockFindByPetId.mockResolvedValue([]);

    const result = await getVisitsByPetUseCase.execute(validPetId);

    expect(result).toHaveLength(0);
    expect(mockFindByPetId).toHaveBeenCalledWith(validPetId);
  });

  it('debe lanzar error si el ID de la mascota es inválido', async () => {
    await expect(getVisitsByPetUseCase.execute('')).rejects.toThrow('El ID de la mascota es requerido');
  });

  it('debe lanzar error si el ID de la mascota es null', async () => {
    await expect(getVisitsByPetUseCase.execute(null as unknown as string)).rejects.toThrow('El ID de la mascota es requerido');
  });
});