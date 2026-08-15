// src/__tests__/domain/use-cases/check-vaccine-due.use-case.test.ts
import { CheckVaccineDueUseCase } from '@/src/application/use-cases/vaccine/check-vaccine.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';

describe('CheckVaccineDueUseCase', () => {
  let useCase: CheckVaccineDueUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;

  beforeEach(() => {
    mockRepository = {
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn()
    };
    useCase = new CheckVaccineDueUseCase(mockRepository);
  });

  it('debe retornar que la vacuna está vencida', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    
    const vaccine = Vaccine.create(
      'uuid-123',
      'pet-123',
      'Rabia',
      'LOT-2024-001',
      new Date('2024-01-15'),
      pastDate,
      'Dr. Pérez',
      'Notas',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(vaccine);

    const result = await useCase.execute('uuid-123');

    expect(result.id).toBe('uuid-123');
    expect(result.isDue).toBe(true);
    expect(result.daysUntilDue).toBeLessThan(0);
  });

  it('debe retornar que la vacuna no está vencida', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const vaccine = Vaccine.create(
      'uuid-123',
      'pet-123',
      'Rabia',
      'LOT-2024-001',
      new Date('2024-01-15'),
      futureDate,
      'Dr. Pérez',
      'Notas',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(vaccine);

    const result = await useCase.execute('uuid-123');

    expect(result.id).toBe('uuid-123');
    expect(result.isDue).toBe(false);
    expect(result.daysUntilDue).toBeGreaterThan(0);
  });

  it('debe retornar daysUntilDue null si no hay próxima dosis', async () => {
    const vaccine = Vaccine.create(
      'uuid-123',
      'pet-123',
      'Rabia',
      'LOT-2024-001',
      new Date('2024-01-15'),
      null,
      'Dr. Pérez',
      'Notas',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(vaccine);

    const result = await useCase.execute('uuid-123');

    expect(result.isDue).toBe(false);
    expect(result.daysUntilDue).toBeNull();
  });

  it('debe lanzar error si la vacuna no existe', async () => {
    mockRepository.getById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-invalido')).rejects.toThrow(
      'Vacuna no encontrada'
    );
  });

  it('debe lanzar error si el ID está vacío', async () => {
    await expect(useCase.execute('')).rejects.toThrow(
      'El ID de la vacuna es requerido'
    );
  });

  it('debe incluir el nombre y fechas en el resultado', async () => {
    const vaccine = Vaccine.create(
      'uuid-123',
      'pet-123',
      'Rabia',
      'LOT-2024-001',
      new Date('2024-01-15'),
      new Date('2025-01-15'),
      'Dr. Pérez',
      'Notas',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(vaccine);

    const result = await useCase.execute('uuid-123');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('isDue');
    expect(result).toHaveProperty('daysUntilDue');
    expect(result).toHaveProperty('nextDoseDate');
    expect(result).toHaveProperty('applicationDate');
  });
});