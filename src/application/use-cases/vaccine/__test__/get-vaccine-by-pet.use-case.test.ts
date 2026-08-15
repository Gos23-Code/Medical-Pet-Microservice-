// src/__tests__/domain/use-cases/get-vaccines-by-pet.use-case.test.ts
import { GetVaccinesByPetUseCase } from '@/src/application/use-cases/vaccine/get-vaccine-by-pet.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';

describe('GetVaccinesByPetUseCase', () => {
  let useCase: GetVaccinesByPetUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;

  const mockVaccines = [
    Vaccine.create(
      'uuid-1',
      'pet-123',
      'Rabia',
      'LOT-2024-001',
      new Date('2024-01-15'),
      new Date('2025-01-15'),
      'Dr. Pérez',
      'Primera dosis',
      new Date()
    ),
    Vaccine.create(
      'uuid-2',
      'pet-123',
      'Moquillo',
      'LOT-2024-002',
      new Date('2024-02-15'),
      new Date('2025-02-15'),
      'Dra. Gómez',
      'Segunda dosis',
      new Date()
    )
  ];

  beforeEach(() => {
    mockRepository = {
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn()
    };
    useCase = new GetVaccinesByPetUseCase(mockRepository);
  });

  it('debe obtener vacunas por ID de mascota', async () => {
    const petId = 'pet-123';
    mockRepository.getByPetId.mockResolvedValue(mockVaccines);

    const result = await useCase.execute(petId);

    expect(result).toHaveLength(2);
    expect(result[0].petId).toBe(petId);
    expect(mockRepository.getByPetId).toHaveBeenCalledWith(petId);
  });

  it('debe retornar array vacío si la mascota no tiene vacunas', async () => {
    const petId = 'pet-sin-vacunas';
    mockRepository.getByPetId.mockResolvedValue([]);

    const result = await useCase.execute(petId);

    expect(result).toEqual([]);
  });

  it('debe lanzar error si petId falta', async () => {
    await expect(useCase.execute('')).rejects.toThrow(
      'El ID de la mascota es requerido'
    );
  });

  it('debe lanzar error si el repositorio falla', async () => {
    const petId = 'pet-123';
    mockRepository.getByPetId.mockRejectedValue(new Error('Error de base de datos'));

    await expect(useCase.execute(petId)).rejects.toThrow('Error de base de datos');
  });
});