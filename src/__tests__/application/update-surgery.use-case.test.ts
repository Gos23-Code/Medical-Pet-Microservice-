// src/__tests__/application/update-surgery.use-case.test.ts
import { UpdateSurgeryUseCase, UpdateSurgeryCommand } from '@/application/use-cases/update-surgery.use-case';
import { PetSurgeryRepository } from '@/domain/repositories/petSurgery.repository';
import { PetSurgery, PetSurgeryStatus } from '@/domain/entities/petSurgery.entity';

const createMockRepository = (): jest.Mocked<PetSurgeryRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByVisitId: jest.fn(),
  findByPetId: jest.fn(),
});

describe('UpdateSurgeryUseCase', () => {
  let useCase: UpdateSurgeryUseCase;
  let mockRepository: jest.Mocked<PetSurgeryRepository>;
  let existingSurgery: PetSurgery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    useCase = new UpdateSurgeryUseCase(mockRepository);
    
    existingSurgery = PetSurgery.create({
      petId: 'pet-123',
      veterinaryVisitId: 'visit-123',
      title: 'Cirugía original',
      description: 'Descripción original',
      surgeryDate: new Date('2025-12-15'),
      durationMinutes: 60,
      status: 'SCHEDULED',
    });
    
    mockRepository.findById.mockResolvedValue(existingSurgery);
  });

  describe('execute - actualizaciones exitosas', () => {
    it('debe actualizar el título', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        title: 'Nuevo título',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.title).toBe('Nuevo título');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('debe actualizar la descripción', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        description: 'Nueva descripción detallada',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.description).toBe('Nueva descripción detallada');
    });

    it('debe actualizar la duración', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        durationMinutes: 120,
      };
      
      const result = await useCase.execute(command);
      
      expect(result.durationMinutes).toBe(120);
    });

    it('debe actualizar la anestesia usada', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        anesthesiaUsed: 'Sevoflurano',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.anesthesiaUsed).toBe('Sevoflurano');
    });

    it('debe actualizar las instrucciones postoperatorias', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        postOpInstructions: 'Reposo absoluto por 3 semanas',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.postOpInstructions).toBe('Reposo absoluto por 3 semanas');
    });

    it('debe actualizar múltiples campos a la vez', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        title: 'Título actualizado',
        description: 'Descripción actualizada',
        durationMinutes: 150,
        anesthesiaUsed: 'Isoflurano',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.title).toBe('Título actualizado');
      expect(result.description).toBe('Descripción actualizada');
      expect(result.durationMinutes).toBe(150);
      expect(result.anesthesiaUsed).toBe('Isoflurano');
    });
  });

  describe('execute - transiciones de estado', () => {
    it('debe permitir SCHEDULED -> IN_PROGRESS', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'IN_PROGRESS',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('debe permitir SCHEDULED -> CANCELLED', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'CANCELLED',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.status).toBe('CANCELLED');
    });

    it('debe bloquear SCHEDULED -> COMPLETED', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'COMPLETED',
        outcome: 'SUCCESSFUL',
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Cannot transition from SCHEDULED to COMPLETED');
    });

    it('debe permitir IN_PROGRESS -> COMPLETED con outcome', async () => {
      existingSurgery.update({ status: 'IN_PROGRESS' });
      
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'COMPLETED',
        outcome: 'SUCCESSFUL',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.status).toBe('COMPLETED');
      expect(result.outcome).toBe('SUCCESSFUL');
    });

    it('debe permitir IN_PROGRESS -> COMPLICATED', async () => {
      existingSurgery.update({ status: 'IN_PROGRESS' });
      
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'COMPLICATED',
        complications: 'Sangrado inesperado',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.status).toBe('COMPLICATED');
    });

    it('debe permitir COMPLICATED -> COMPLETED', async () => {
      existingSurgery.update({ status: 'COMPLICATED' });
      
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        status: 'COMPLETED',
        outcome: 'COMPLICATIONS',
      };
      
      const result = await useCase.execute(command);
      
      expect(result.status).toBe('COMPLETED');
      expect(result.outcome).toBe('COMPLICATIONS');
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar solo el estado a IN_PROGRESS', async () => {
      const result = await useCase.updateStatus({
        id: existingSurgery.id,
        status: 'IN_PROGRESS',
      });
      
      expect(result.status).toBe('IN_PROGRESS');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('debe actualizar estado a COMPLETED con outcome', async () => {
      existingSurgery.update({ status: 'IN_PROGRESS' });
      
      const result = await useCase.updateStatus({
        id: existingSurgery.id,
        status: 'COMPLETED',
        outcome: 'SUCCESSFUL',
      });
      
      expect(result.status).toBe('COMPLETED');
      expect(result.outcome).toBe('SUCCESSFUL');
    });

    it('debe fallar si no se proporciona status', async () => {
      await expect(useCase.updateStatus({ 
        id: existingSurgery.id, 
        status: '' as PetSurgeryStatus 
      })).rejects.toThrow('Status is required');
    });
  });

  describe('validaciones', () => {
    it('debe fallar si el ID está vacío', async () => {
      const command: UpdateSurgeryCommand = { id: '' };
      
      await expect(useCase.execute(command)).rejects.toThrow('Surgery ID is required');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('debe fallar si la cirugía no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      const command: UpdateSurgeryCommand = { id: 'not-exist' };
      
      await expect(useCase.execute(command)).rejects.toThrow('Surgery with id not-exist not found');
    });

    it('debe fallar si el título está vacío', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        title: '',
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Title cannot be empty');
    });

    it('debe fallar si la descripción está vacía', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        description: '',
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Description cannot be empty');
    });

    it('debe fallar si la duración es 0', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        durationMinutes: 0,
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Duration must be greater than 0');
    });

    it('debe fallar si la duración es negativa', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        durationMinutes: -10,
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Duration must be greater than 0');
    });

    it('debe fallar si la duración excede 480 minutos', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        durationMinutes: 500,
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Duration cannot exceed 480 minutes');
    });

    it('debe fallar si la fecha es pasada', async () => {
      const command: UpdateSurgeryCommand = {
        id: existingSurgery.id,
        surgeryDate: new Date('2020-01-01'),
      };
      
      await expect(useCase.execute(command)).rejects.toThrow('Surgery date cannot be in the past');
    });
  });
});