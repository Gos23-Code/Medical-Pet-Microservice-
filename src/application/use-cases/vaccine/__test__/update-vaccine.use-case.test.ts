// src/__tests__/domain/use-cases/update-vaccine.use-case.test.ts
import { UpdateVaccineUseCase } from '@/src/application/use-cases/vaccine/update-vaccine.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { UpdateVaccineDTO } from '@/src/application/dtos/vaccine.dto';

describe('UpdateVaccineUseCase', () => {
  let useCase: UpdateVaccineUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;

  const mockVaccine = Vaccine.create(
    'uuid-123',
    'pet-123',
    'Rabia',
    'LOT-2024-001',
    new Date('2024-01-15'),
    new Date('2025-01-15'),
    'Dr. Pérez',
    'Primera dosis',
    new Date()
  );

  beforeEach(() => {
    mockRepository = {
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn()
    };
    useCase = new UpdateVaccineUseCase(mockRepository);
  });

  it('debe actualizar una vacuna exitosamente', async () => {
    const dto: UpdateVaccineDTO = {
      id: 'uuid-123',
      name: 'Rabia (Refuerzo)',
      nextDoseDate: new Date('2026-01-15')
    };

    mockRepository.getById.mockResolvedValue(mockVaccine);
    mockRepository.updateVaccine.mockResolvedValue(
      Vaccine.create(
        mockVaccine.id,
        mockVaccine.petId,
        dto.name!,
        mockVaccine.lotNumber!,
        mockVaccine.applicationDate,
        dto.nextDoseDate!,
        mockVaccine.veterinarian!,
        mockVaccine.notes!,
        mockVaccine.createdAt
      )
    );

    const result = await useCase.execute(dto);

    expect(result.nameValue).toBe('Rabia (Refuerzo)');
    expect(mockRepository.updateVaccine).toHaveBeenCalled();
  });

  it('debe lanzar error si el ID falta', async () => {
    const dto: UpdateVaccineDTO = { id: '' };
    await expect(useCase.execute(dto)).rejects.toThrow(
      'El ID de la vacuna es requerido'
    );
  });

  it('debe lanzar error si la vacuna no existe', async () => {
    const dto: UpdateVaccineDTO = {
      id: 'uuid-invalido',
      name: 'Rabia (Refuerzo)'
    };

    mockRepository.getById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'Vacuna no encontrada'
    );
  });

  it('debe lanzar error si applicationDate es futura', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const dto: UpdateVaccineDTO = {
      id: 'uuid-123',
      applicationDate: futureDate
    };

    mockRepository.getById.mockResolvedValue(mockVaccine);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'La fecha de aplicación no puede ser futura'
    );
  });

  it('debe lanzar error si nextDoseDate es anterior a applicationDate', async () => {
    const dto: UpdateVaccineDTO = {
      id: 'uuid-123',
      applicationDate: new Date('2024-01-15'),
      nextDoseDate: new Date('2024-01-14')
    };

    mockRepository.getById.mockResolvedValue(mockVaccine);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'La próxima dosis debe ser posterior a la fecha de aplicación'
    );
  });
});