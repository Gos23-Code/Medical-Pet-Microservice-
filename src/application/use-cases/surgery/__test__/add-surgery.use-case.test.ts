// src/__tests__/application/add-surgery.use-case.test.ts
import { AddSurgeryUseCase, AddSurgeryCommand } from '@/src/application/use-cases/surgery/add-surgery.use-case';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';

// Mock del repositorio
const createMockRepository = (): jest.Mocked<PetSurgeryRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByVisitId: jest.fn(),
  findByPetId: jest.fn(),
});

describe('AddSurgeryUseCase', () => {
  let useCase: AddSurgeryUseCase;
  let mockRepository: jest.Mocked<PetSurgeryRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    useCase = new AddSurgeryUseCase(mockRepository);
  });

  // Función auxiliar para obtener fecha futura
  const getFutureDate = (): Date => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  };

  const validCommand: AddSurgeryCommand = {
    petId: '123e4567-e89b-12d3-a456-426614174000',
    veterinaryVisitId: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Cirugía de rodilla',
    description: 'Reparación de ligamento cruzado anterior',
    surgeryDate: getFutureDate(),
    durationMinutes: 90,
    anesthesiaUsed: 'Isoflurano',
    postOpInstructions: 'Reposo por 2 semanas',
  };

  describe('execute - casos exitosos', () => {
    it('debe crear una cirugía exitosamente con datos completos', async () => {
      const result = await useCase.execute(validCommand);

      expect(result).toBeInstanceOf(PetSurgery);
      expect(result.title).toBe(validCommand.title);
      expect(result.petId).toBe(validCommand.petId);
      expect(result.veterinaryVisitId).toBe(validCommand.veterinaryVisitId);
      expect(result.description).toBe(validCommand.description);
      expect(result.durationMinutes).toBe(validCommand.durationMinutes);
      expect(result.anesthesiaUsed).toBe(validCommand.anesthesiaUsed);
      expect(result.postOpInstructions).toBe(validCommand.postOpInstructions);
      expect(result.status).toBe('SCHEDULED');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debe guardar la cirugía en el repositorio', async () => {
      const result = await useCase.execute(validCommand);

      expect(mockRepository.save).toHaveBeenCalledWith(result);
    });

    it('debe crear una cirugía con datos mínimos (sin campos opcionales)', async () => {
      const futureDate = getFutureDate();
      const minimalCommand: AddSurgeryCommand = {
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Cirugía mínima',
        description: 'Descripción mínima',
        surgeryDate: futureDate,
        durationMinutes: 30,
      };

      const result = await useCase.execute(minimalCommand);

      expect(result.title).toBe('Cirugía mínima');
      expect(result.anesthesiaUsed).toBeUndefined();
      expect(result.postOpInstructions).toBeUndefined();
      expect(mockRepository.save).toHaveBeenCalledWith(result);
    });
  });

  describe('execute - validaciones de campos requeridos', () => {
    it('debe fallar si el petId está vacío', async () => {
      const invalidCommand = { ...validCommand, petId: '' };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Pet ID is required');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si el veterinaryVisitId está vacío', async () => {
      const invalidCommand = { ...validCommand, veterinaryVisitId: '' };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Veterinary visit ID is required');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si el título está vacío', async () => {
      const invalidCommand = { ...validCommand, title: '' };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Title is required');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si el título es solo espacios', async () => {
      const invalidCommand = { ...validCommand, title: '   ' };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Title is required');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si la descripción está vacía', async () => {
      const invalidCommand = { ...validCommand, description: '' };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Description is required');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - validaciones de duración', () => {
    it('debe fallar si la duración es 0', async () => {
      const invalidCommand = { ...validCommand, durationMinutes: 0 };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Duration must be greater than 0');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si la duración es negativa', async () => {
      const invalidCommand = { ...validCommand, durationMinutes: -10 };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Duration must be greater than 0');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe fallar si la duración excede 480 minutos (8 horas)', async () => {
      const invalidCommand = { ...validCommand, durationMinutes: 500 };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Duration cannot exceed 480 minutes');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe aceptar duración máxima de 480 minutos', async () => {
      const validCommandMax = { ...validCommand, durationMinutes: 480 };
      
      const result = await useCase.execute(validCommandMax);
      
      expect(result.durationMinutes).toBe(480);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('execute - validaciones de fecha', () => {
    it('debe fallar si la fecha es pasada', async () => {
      const pastDate = new Date('2020-01-01');
      const invalidCommand = { ...validCommand, surgeryDate: pastDate };
      
      await expect(useCase.execute(invalidCommand)).rejects.toThrow('Surgery date cannot be in the past');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe aceptar fecha futura', async () => {
      const futureDate = getFutureDate();
      const validCommandFuture = { ...validCommand, surgeryDate: futureDate };
      
      const result = await useCase.execute(validCommandFuture);
      
      expect(result.surgeryDate).toEqual(futureDate);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debe aceptar fecha de mañana', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const validCommandTomorrow = { ...validCommand, surgeryDate: tomorrow };
      
      const result = await useCase.execute(validCommandTomorrow);
      
      expect(result.surgeryDate).toEqual(tomorrow);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});