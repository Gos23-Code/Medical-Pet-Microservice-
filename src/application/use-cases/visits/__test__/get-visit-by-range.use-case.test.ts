import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetVisitsByDateRangeUseCase } from '@/src/application/use-cases/visits/get-visit-by-date-range.-use-case';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';

describe('GetVisitsByDateRangeUseCase', () => {
  let getVisitsByDateRangeUseCase: GetVisitsByDateRangeUseCase;
  let mockFindByDateRange: jest.Mock;

  beforeEach(() => {
    mockFindByDateRange = jest.fn();

    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByPetId: jest.fn(),
      findByDateRange: mockFindByDateRange,
      update: jest.fn(),
      delete: jest.fn(),
    };

    // @ts-expect-error - Mock para pruebas
    getVisitsByDateRangeUseCase = new GetVisitsByDateRangeUseCase(mockRepository);
  });

  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');

  it('debe retornar visitas en el rango de fechas exitosamente', async () => {
    const mockVisits = [
      VeterinaryVisit.create({
        id: '1',
        petId: 'pet-123',
        date: new Date('2024-03-15'),
        reason: 'Consulta general',
        veterinarian: 'Dr. Juan Pérez',
        notes: undefined,
      }),
    ];
    // @ts-expect-error - Mock para pruebas
    mockFindByDateRange.mockResolvedValue(mockVisits);

    const result = await getVisitsByDateRangeUseCase.execute(startDate, endDate);

    expect(result).toHaveLength(1);
    expect(mockFindByDateRange).toHaveBeenCalledWith(startDate, endDate);
  });

  it('debe retornar array vacío si no hay visitas en el rango', async () => {
    // @ts-expect-error - Mock para pruebas
    mockFindByDateRange.mockResolvedValue([]);

    const result = await getVisitsByDateRangeUseCase.execute(startDate, endDate);

    expect(result).toHaveLength(0);
  });

  it('debe lanzar error si startDate es mayor que endDate', async () => {
    const invalidStartDate = new Date('2024-12-31');
    const invalidEndDate = new Date('2024-01-01');

    await expect(getVisitsByDateRangeUseCase.execute(invalidStartDate, invalidEndDate))
      .rejects
      .toThrow('La fecha de inicio debe ser menor a la fecha de fin');
  });

  it('debe lanzar error si startDate es inválido', async () => {
    // @ts-expect-error - Probando entrada inválida
    await expect(getVisitsByDateRangeUseCase.execute(null, endDate))
      .rejects
      .toThrow('La fecha de inicio es requerida');
  });

  it('debe lanzar error si endDate es inválido', async () => {
    // @ts-expect-error - Probando entrada inválida
    await expect(getVisitsByDateRangeUseCase.execute(startDate, null))
      .rejects
      .toThrow('La fecha de fin es requerida');
  });
});