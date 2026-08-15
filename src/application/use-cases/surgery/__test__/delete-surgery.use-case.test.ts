// src/__tests__/application/delete-surgery.use-case.test.ts
import { DeleteSurgeryUseCase } from '@/src/application/use-cases/surgery/delete-surgery.use-case';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';
import { PetSurgery, PetSurgeryStatus } from '@/src/domain/entities/pet-surgery.entity';

const createMockRepository = (): jest.Mocked<PetSurgeryRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByVisitId: jest.fn(),
  findByPetId: jest.fn(),
});

describe('DeleteSurgeryUseCase', () => {
  let useCase: DeleteSurgeryUseCase;
  let mockRepository: jest.Mocked<PetSurgeryRepository>;

  // Función auxiliar para obtener fecha futura
  const getFutureDate = (): Date => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  };

  const createSurgeryWithStatus = (status: PetSurgeryStatus) => {
    return PetSurgery.create({
      petId: 'pet-123',
      veterinaryVisitId: 'visit-123',
      title: 'Cirugía test',
      description: 'Descripción test',
      surgeryDate: getFutureDate(), // Fecha futura
      durationMinutes: 60,
      status: status,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    useCase = new DeleteSurgeryUseCase(mockRepository);
  });

  describe('execute - eliminación exitosa', () => {
    it('debe eliminar una cirugía programada', async () => {
      const surgery = createSurgeryWithStatus('SCHEDULED');
      mockRepository.findById.mockResolvedValue(surgery);
      
      await useCase.execute(surgery.id);
      
      expect(mockRepository.delete).toHaveBeenCalledWith(surgery.id);
    });

    it('debe eliminar una cirugía cancelada', async () => {
      const surgery = createSurgeryWithStatus('CANCELLED');
      mockRepository.findById.mockResolvedValue(surgery);
      
      await useCase.execute(surgery.id);
      
      expect(mockRepository.delete).toHaveBeenCalledWith(surgery.id);
    });
  });

  describe('execute - eliminación bloqueada', () => {
    it('debe bloquear eliminación de cirugía en progreso', async () => {
      const surgery = createSurgeryWithStatus('IN_PROGRESS');
      mockRepository.findById.mockResolvedValue(surgery);
      
      await expect(useCase.execute(surgery.id)).rejects.toThrow('Cannot delete a surgery that is in progress');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('debe bloquear eliminación de cirugía completada', async () => {
      const surgery = createSurgeryWithStatus('COMPLETED');
      mockRepository.findById.mockResolvedValue(surgery);
      
      await expect(useCase.execute(surgery.id)).rejects.toThrow('Cannot delete a completed surgery');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('debe bloquear eliminación de cirugía complicada', async () => {
      const surgery = createSurgeryWithStatus('COMPLICATED');
      mockRepository.findById.mockResolvedValue(surgery);
      
      await expect(useCase.execute(surgery.id)).rejects.toThrow('Cannot delete a surgery that is in progress');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('validaciones', () => {
    it('debe fallar si el ID está vacío', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Surgery ID is required');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('debe fallar si el ID es solo espacios', async () => {
      await expect(useCase.execute('   ')).rejects.toThrow('Surgery ID is required');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('debe fallar si la cirugía no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      await expect(useCase.execute('not-exist')).rejects.toThrow('Surgery with id not-exist not found');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});