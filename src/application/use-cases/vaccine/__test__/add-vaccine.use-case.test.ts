// src/__tests__/domain/use-cases/add-vaccine.use-case.test.ts
import { AddVaccineUseCase } from '@/src/application/use-cases/vaccine/add-vaccine.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { CreateVaccineDTO } from '@/src/application/dtos/vaccine.dto';

describe('AddVaccineUseCase', () => {
  let useCase: AddVaccineUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;

  beforeEach(() => {
    mockRepository = {
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn()
    };
    useCase = new AddVaccineUseCase(mockRepository);
  });

  const validDTO: CreateVaccineDTO = {
    petId: 'pet-123',
    name: 'Rabia',
    lotNumber: 'LOT-2024-001',
    applicationDate: new Date('2024-01-15'),
    nextDoseDate: new Date('2025-01-15'),
    veterinarian: 'Dr. Pérez',
    notes: 'Primera dosis'
  };

  it('debe agregar una vacuna exitosamente', async () => {
    const expectedVaccine = Vaccine.create(
      'uuid-123',
      validDTO.petId,
      validDTO.name,
      validDTO.lotNumber!,
      validDTO.applicationDate,
      validDTO.nextDoseDate!,
      validDTO.veterinarian!,
      validDTO.notes!,
      new Date()
    );

    mockRepository.addVaccine.mockResolvedValue(expectedVaccine);

    const result = await useCase.execute(validDTO);

    expect(result).toEqual(expectedVaccine);
    expect(mockRepository.addVaccine).toHaveBeenCalled();
  });

  it('debe lanzar error si petId falta', async () => {
    const invalidDTO = { ...validDTO, petId: '' };
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'El ID de la mascota es requerido'
    );
  });

  it('debe lanzar error si name falta', async () => {
    const invalidDTO = { ...validDTO, name: '' };
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'El nombre de la vacuna es requerido'
    );
  });

  it('debe lanzar error si applicationDate falta', async () => {
    const invalidDTO2 = { ...validDTO, applicationDate: undefined as unknown as Date };
    
    await expect(useCase.execute(invalidDTO2)).rejects.toThrow(
      'La fecha de aplicación es requerida'
    );
  });

  it('debe lanzar error si applicationDate es futura', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const invalidDTO = { ...validDTO, applicationDate: futureDate };
    
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'La fecha de aplicación no puede ser futura'
    );
  });

  it('debe lanzar error si nextDoseDate es anterior a applicationDate', async () => {
    const invalidDTO = {
      ...validDTO,
      applicationDate: new Date('2024-01-15'),
      nextDoseDate: new Date('2024-01-14')
    };
    
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'La próxima dosis debe ser posterior a la fecha de aplicación'
    );
  });

  it('debe permitir crear vacuna sin próxima dosis', async () => {
    const dtoWithoutNextDose = { ...validDTO, nextDoseDate: null };
    const expectedVaccine = Vaccine.create(
      'uuid-123',
      dtoWithoutNextDose.petId,
      dtoWithoutNextDose.name,
      dtoWithoutNextDose.lotNumber!,
      dtoWithoutNextDose.applicationDate,
      null,
      dtoWithoutNextDose.veterinarian!,
      dtoWithoutNextDose.notes!,
      new Date()
    );

    mockRepository.addVaccine.mockResolvedValue(expectedVaccine);

    const result = await useCase.execute(dtoWithoutNextDose);

    expect(result.nextDoseDateValue).toBeNull();
  });
});