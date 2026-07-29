// src/__tests__/application/get-surgery.use-case.test.ts
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';

const createMockRepository = (): jest.Mocked<PetSurgeryRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByVisitId: jest.fn(),
  findByPetId: jest.fn(),
});

describe('GetSurgeriesUseCase', () => {
  let useCase: GetSurgeriesUseCase;
  let mockRepository: jest.Mocked<PetSurgeryRepository>;

  // Función auxiliar para obtener fecha futura
  const getFutureDate = (): Date => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  };

  const createMockSurgery = (props?: Partial<Parameters<typeof PetSurgery.create>[0]>) => {
    return PetSurgery.create({
      petId: 'pet-123',
      veterinaryVisitId: 'visit-123',
      title: 'Cirugía test',
      description: 'Descripción test',
      surgeryDate: getFutureDate(),
      durationMinutes: 60,
      status: 'SCHEDULED',
      ...props,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    useCase = new GetSurgeriesUseCase(mockRepository);
  });

  describe('execute - búsqueda por visita', () => {
    it('debe retornar cirugías por visitId', async () => {
      const mockSurgeries = [createMockSurgery(), createMockSurgery()];
      mockRepository.findByVisitId.mockResolvedValue(mockSurgeries);
      
      const result = await useCase.execute({ visitId: 'visit-123' });
      
      expect(mockRepository.findByVisitId).toHaveBeenCalledWith('visit-123');
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockSurgeries);
    });

    it('debe retornar array vacío si no hay cirugías en la visita', async () => {
      mockRepository.findByVisitId.mockResolvedValue([]);
      
      const result = await useCase.execute({ visitId: 'visit-123' });
      
      expect(result).toEqual([]);
    });

    it('debe fallar si visitId está vacío', async () => {
      await expect(useCase.execute({ visitId: '' })).rejects.toThrow('At least one filter is required: visitId or petId');
    });
  });

  describe('execute - búsqueda por mascota', () => {
    it('debe retornar cirugías por petId', async () => {
      const mockSurgeries = [createMockSurgery()];
      mockRepository.findByPetId.mockResolvedValue(mockSurgeries);
      
      const result = await useCase.execute({ petId: 'pet-123' });
      
      expect(mockRepository.findByPetId).toHaveBeenCalledWith('pet-123');
      expect(result).toHaveLength(1);
    });

    it('debe retornar array vacío si no hay cirugías para la mascota', async () => {
      mockRepository.findByPetId.mockResolvedValue([]);
      
      const result = await useCase.execute({ petId: 'pet-123' });
      
      expect(result).toEqual([]);
    });

    it('debe fallar si petId está vacío', async () => {
      await expect(useCase.execute({ petId: '' })).rejects.toThrow('At least one filter is required: visitId or petId');
    });
  });

  describe('execute - filtros adicionales', () => {
    it('debe filtrar por estado', async () => {
      const scheduledSurgery = createMockSurgery({ status: 'SCHEDULED' });
      const completedSurgery = createMockSurgery({ status: 'COMPLETED' });
      mockRepository.findByPetId.mockResolvedValue([scheduledSurgery, completedSurgery]);
      
      const result = await useCase.execute({ 
        petId: 'pet-123', 
        status: 'COMPLETED' 
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('COMPLETED');
    });

    it('debe filtrar por rango de fechas (fromDate)', async () => {
      const baseDate = getFutureDate();
      const earlierDate = new Date(baseDate);
      const laterDate = new Date(baseDate);
      laterDate.setDate(laterDate.getDate() + 5);
      
      const surgery1 = createMockSurgery({ surgeryDate: earlierDate });
      const surgery2 = createMockSurgery({ surgeryDate: laterDate });
      mockRepository.findByPetId.mockResolvedValue([surgery1, surgery2]);
      
      const fromDate = new Date(earlierDate);
      fromDate.setDate(fromDate.getDate() + 1);
      
      const result = await useCase.execute({
        petId: 'pet-123',
        fromDate: fromDate,
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].surgeryDate).toEqual(surgery2.surgeryDate);
    });

    it('debe filtrar por rango de fechas (toDate)', async () => {
      const baseDate = getFutureDate();
      const earlierDate = new Date(baseDate);
      const laterDate = new Date(baseDate);
      laterDate.setDate(laterDate.getDate() + 10);
      
      const surgery1 = createMockSurgery({ surgeryDate: earlierDate });
      const surgery2 = createMockSurgery({ surgeryDate: laterDate });
      mockRepository.findByPetId.mockResolvedValue([surgery1, surgery2]);
      
      const toDate = new Date(earlierDate);
      toDate.setDate(toDate.getDate() + 5);
      
      const result = await useCase.execute({
        petId: 'pet-123',
        toDate: toDate,
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].surgeryDate).toEqual(surgery1.surgeryDate);
    });

    it('debe filtrar por rango completo de fechas', async () => {
      const baseDate = getFutureDate();
      const date1 = new Date(baseDate);
      const date2 = new Date(baseDate);
      date2.setDate(date2.getDate() + 5);
      const date3 = new Date(baseDate);
      date3.setDate(date3.getDate() + 10);
      
      const surgeries = [
        createMockSurgery({ surgeryDate: date1 }),
        createMockSurgery({ surgeryDate: date2 }),
        createMockSurgery({ surgeryDate: date3 }),
      ];
      mockRepository.findByPetId.mockResolvedValue(surgeries);
      
      const fromDate = new Date(date1);
      fromDate.setDate(fromDate.getDate() + 2);
      const toDate = new Date(date1);
      toDate.setDate(toDate.getDate() + 7);
      
      const result = await useCase.execute({
        petId: 'pet-123',
        fromDate: fromDate,
        toDate: toDate,
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].surgeryDate).toEqual(date2);
    });
  });

  describe('execute - validaciones', () => {
    it('debe fallar si no se proporciona visitId ni petId', async () => {
      await expect(useCase.execute({})).rejects.toThrow('At least one filter is required: visitId or petId');
    });

    it('debe fallar si ambos filtros están vacíos', async () => {
      await expect(useCase.execute({ visitId: '', petId: '' })).rejects.toThrow('At least one filter is required: visitId or petId');
    });
  });

  describe('getById', () => {
    it('debe retornar una cirugía por ID', async () => {
      const mockSurgery = createMockSurgery();
      mockRepository.findById.mockResolvedValue(mockSurgery);
      
      const result = await useCase.getById('surgery-123');
      
      expect(result).toBe(mockSurgery);
      expect(mockRepository.findById).toHaveBeenCalledWith('surgery-123');
    });

    it('debe fallar si el ID está vacío', async () => {
      await expect(useCase.getById('')).rejects.toThrow('Surgery ID is required');
    });

    it('debe fallar si el ID es solo espacios', async () => {
      await expect(useCase.getById('   ')).rejects.toThrow('Surgery ID is required');
    });

    it('debe fallar si no encuentra la cirugía', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      await expect(useCase.getById('not-found')).rejects.toThrow('Surgery with id not-found not found');
    });
  });

  describe('getStatistics', () => {
    it('debe calcular estadísticas correctamente con múltiples cirugías', async () => {
      const surgeries = [
        createMockSurgery({ status: 'SCHEDULED' }),
        createMockSurgery({ status: 'IN_PROGRESS' }),
        createMockSurgery({ status: 'COMPLETED', outcome: 'SUCCESSFUL', durationMinutes: 90 }),
        createMockSurgery({ status: 'COMPLETED', outcome: 'SUCCESSFUL', durationMinutes: 120 }),
        createMockSurgery({ status: 'COMPLETED', outcome: 'COMPLICATIONS', durationMinutes: 150 }),
      ];
      mockRepository.findByPetId.mockResolvedValue(surgeries);
      
      const stats = await useCase.getStatistics({ petId: 'pet-123' });
      
      expect(stats.total).toBe(5);
      expect(stats.scheduled).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(3);
      expect(stats.complicated).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.successRate).toBe(66.66666666666666);
      expect(stats.averageDuration).toBe(120);
    });

    it('debe retornar estadísticas en cero cuando no hay cirugías', async () => {
      mockRepository.findByPetId.mockResolvedValue([]);
      
      const stats = await useCase.getStatistics({ petId: 'pet-123' });
      
      expect(stats.total).toBe(0);
      expect(stats.scheduled).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.complicated).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });

    it('debe calcular estadísticas filtradas por visita', async () => {
      const surgeries = [
        createMockSurgery({ status: 'COMPLETED', outcome: 'SUCCESSFUL' }),
        createMockSurgery({ status: 'COMPLETED', outcome: 'SUCCESSFUL' }),
      ];
      mockRepository.findByVisitId.mockResolvedValue(surgeries);
      
      const stats = await useCase.getStatistics({ visitId: 'visit-123' });
      
      expect(stats.total).toBe(2);
      expect(stats.successRate).toBe(100);
    });
  });
});