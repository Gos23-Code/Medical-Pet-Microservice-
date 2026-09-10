// src/__tests__/domain/use-cases/add-vaccine.use-case.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AddVaccineUseCase } from '@/src/application/use-cases/vaccine/add-vaccine.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { CreateVaccineDTO } from '@/src/application/dtos/vaccine.dto';
import { VaccinePublisher } from '@/src/infrastructure/pubsub/publishers/vaccine.publisher';
import { PublishResponse } from '@/src/infrastructure/pubsub/interfaces/pubsub.interface';

describe('AddVaccineUseCase', () => {
  let useCase: AddVaccineUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;
  let mockPublisher: jest.Mocked<Pick<VaccinePublisher, 'publishVaccineApplied' | 'publishVaccineUpdated' | 'publishVaccineDueReminder'>>;

  beforeEach(() => {
    // ✅ Mock completo del repositorio
    mockRepository = {
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn(),
      getPendingVaccines: jest.fn(),
      incrementReminderCount: jest.fn(),
      updateLastReminderSent: jest.fn(),
      markAsOverdue: jest.fn(),
      markAsApplied: jest.fn(),
      getVaccinesDueToday: jest.fn(),
      getOverdueVaccines: jest.fn(),
    } as jest.Mocked<IVaccineRepository>;

    // ✅ Mock de publisher con tipos correctos
    const mockResponse: PublishResponse = {
      success: true,
      message_id: 'msg-123',
      event: 'VACCINE_APPLIED',
      timestamp: new Date().toISOString(),
    };

    mockPublisher = {
      publishVaccineApplied: jest.fn<() => Promise<PublishResponse>>().mockResolvedValue(mockResponse),
      publishVaccineUpdated: jest.fn<() => Promise<PublishResponse>>().mockResolvedValue({
        ...mockResponse,
        event: 'VACCINE_UPDATED',
      }),
      publishVaccineDueReminder: jest.fn<() => Promise<PublishResponse>>().mockResolvedValue({
        ...mockResponse,
        event: 'VACCINE_DUE_REMINDER',
      }),
    };

    useCase = new AddVaccineUseCase(
      mockRepository,
      mockPublisher as unknown as VaccinePublisher
    );
  });

  const validDTO: CreateVaccineDTO = {
    userId: 'user-123',
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
      validDTO.userId,
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
    expect(mockPublisher.publishVaccineApplied).toHaveBeenCalled();
  });

  it('debe lanzar error si userId falta', async () => {
    const invalidDTO = { ...validDTO, userId: '' };
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'El ID del usuario es requerido'
    );
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
    const invalidDTO = { ...validDTO, applicationDate: undefined as unknown as Date };
    
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'La fecha de aplicación es requerida'
    );
  });

  it('debe permitir fechas de aplicación futuras', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const futureNextDose = new Date(futureDate);
    futureNextDose.setMonth(futureNextDose.getMonth() + 6);
    
    const dtoWithFutureDate: CreateVaccineDTO = { 
      ...validDTO, 
      applicationDate: futureDate,
      nextDoseDate: futureNextDose
    };
    
    const expectedVaccine = Vaccine.create(
      'uuid-123',
      dtoWithFutureDate.petId,
      dtoWithFutureDate.userId,
      dtoWithFutureDate.name,
      dtoWithFutureDate.lotNumber!,
      dtoWithFutureDate.applicationDate,
      dtoWithFutureDate.nextDoseDate!,
      dtoWithFutureDate.veterinarian!,
      dtoWithFutureDate.notes!,
      new Date()
    );

    mockRepository.addVaccine.mockResolvedValue(expectedVaccine);

    const result = await useCase.execute(dtoWithFutureDate);

    expect(result).toEqual(expectedVaccine);
    expect(mockRepository.addVaccine).toHaveBeenCalled();
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
      dtoWithoutNextDose.userId,
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

  it('debe lanzar error si nextDoseDate es anterior a applicationDate en fecha futura', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const invalidDate = new Date(futureDate);
    invalidDate.setDate(invalidDate.getDate() - 1);
    
    const invalidDTO: CreateVaccineDTO = {
      ...validDTO,
      applicationDate: futureDate,
      nextDoseDate: invalidDate
    };
    
    await expect(useCase.execute(invalidDTO)).rejects.toThrow(
      'La próxima dosis debe ser posterior a la fecha de aplicación'
    );
  });
});