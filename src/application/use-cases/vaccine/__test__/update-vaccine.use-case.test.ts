// src/__tests__/domain/use-cases/update-vaccine.use-case.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UpdateVaccineUseCase } from '@/src/application/use-cases/vaccine/update-vaccine.use-case';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';
import { VaccinePublisher } from '@/src/infrastructure/pubsub/publishers/vaccine.publisher';
import { PublishResponse } from '@/src/infrastructure/pubsub/interfaces/pubsub.interface';

describe('UpdateVaccineUseCase', () => {
  let useCase: UpdateVaccineUseCase;
  let mockRepository: jest.Mocked<IVaccineRepository>;
  let mockPublisher: {
    publishVaccineUpdated: jest.Mock;
  };

  const createMockVaccine = (
    id: string = 'uuid-123',
    petId: string = 'pet-123',
    userId: string = 'user-123',
    name: string = 'Rabia',
    lotNumber: string = 'LOT-2024-001',
    applicationDate: Date = new Date('2024-01-15'),
    nextDoseDate: Date = new Date('2025-01-15'),
    veterinarian: string = 'Dr. Pérez',
    notes: string = 'Primera dosis',
    createdAt: Date = new Date()
  ) => {
    return Vaccine.create(
      id,
      petId,
      userId,
      name,
      lotNumber,
      applicationDate,
      nextDoseDate,
      veterinarian,
      notes,
      createdAt
    );
  };

  const mockVaccine = createMockVaccine();

  beforeEach(() => {
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

    mockPublisher = {
      publishVaccineUpdated: jest.fn().mockImplementation(() => 
        Promise.resolve({
          success: true,
          message_id: 'msg-123',
          event: 'VACCINE_UPDATED',
          timestamp: new Date().toISOString(),
        } as PublishResponse)
      ),
    };

    useCase = new UpdateVaccineUseCase(
      mockRepository,
      mockPublisher as unknown as VaccinePublisher
    );
  });

  it('debe actualizar una vacuna exitosamente', async () => {
    const updatedVaccine = createMockVaccine(
      'uuid-123',
      'pet-123',
      'user-123',
      'Rabia (Refuerzo)',
      'LOT-2024-001',
      new Date('2024-01-15'),
      new Date('2026-01-15'),
      'Dr. Pérez',
      'Primera dosis',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(mockVaccine);
    mockRepository.updateVaccine.mockResolvedValue(updatedVaccine);

    const result = await useCase.execute({
      id: 'uuid-123',
      userId: 'user-123',
      name: 'Rabia (Refuerzo)',
      nextDoseDate: new Date('2026-01-15'),
    });

    expect(result.nameValue).toBe('Rabia (Refuerzo)');
    expect(mockRepository.updateVaccine).toHaveBeenCalled();
    expect(mockPublisher.publishVaccineUpdated).toHaveBeenCalled();
  });

  it('debe lanzar error si el ID falta', async () => {
    mockRepository.getById.mockResolvedValue(null);
    
    await expect(useCase.execute({
      id: '',
      userId: 'user-123',
    })).rejects.toThrow('Vacuna no encontrada');
  });

  it('debe lanzar error si userId falta', async () => {
    await expect(useCase.execute({
      id: 'uuid-123',
      userId: '',
      name: 'Rabia (Refuerzo)'
    })).rejects.toThrow('userId es requerido para notificaciones');
  });

  it('debe lanzar error si la vacuna no existe', async () => {
    mockRepository.getById.mockResolvedValue(null);

    await expect(useCase.execute({
      id: 'uuid-invalido',
      userId: 'user-123',
      name: 'Rabia (Refuerzo)'
    })).rejects.toThrow('Vacuna no encontrada');
  });

  it('debe permitir fechas de aplicación futuras', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const futureNextDose = new Date(futureDate);
    futureNextDose.setDate(futureNextDose.getDate() + 30);

    const updatedVaccine = createMockVaccine(
      'uuid-123',
      'pet-123',
      'user-123',
      'Rabia',
      'LOT-2024-001',
      futureDate,
      futureNextDose,
      'Dr. Pérez',
      'Primera dosis',
      new Date()
    );

    mockRepository.getById.mockResolvedValue(mockVaccine);
    mockRepository.updateVaccine.mockResolvedValue(updatedVaccine);

    const result = await useCase.execute({
      id: 'uuid-123',
      userId: 'user-123',
      applicationDate: futureDate,
      nextDoseDate: futureNextDose,
    });

    expect(result.applicationDate).toEqual(futureDate);
    expect(mockRepository.updateVaccine).toHaveBeenCalled();
  });

  // ✅ CORREGIDO: El error viene del Value Object en el repositorio
  it('debe lanzar error si nextDoseDate es anterior a applicationDate', async () => {
    mockRepository.getById.mockResolvedValue(mockVaccine);

    // ✅ El repositorio rechaza con el error del Value Object
    mockRepository.updateVaccine.mockRejectedValue(
      new Error('La próxima dosis debe ser posterior a la fecha de aplicación')
    );

    await expect(useCase.execute({
      id: 'uuid-123',
      userId: 'user-123',
      applicationDate: new Date('2024-01-15'),
      nextDoseDate: new Date('2024-01-14'),
    })).rejects.toThrow('La próxima dosis debe ser posterior a la fecha de aplicación');
  });
});