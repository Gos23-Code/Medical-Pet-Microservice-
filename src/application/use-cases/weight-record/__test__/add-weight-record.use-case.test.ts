// add-weight-record.use-case.test.ts
import { AddWeightRecordUseCase } from '../add-weight-record.use-case';
import { weightRecordMapper } from '@/src/application/mappers/weight-record.mapper';
import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { CreateWeightRecordDto, weightRecordResponseDto } from '@/src/application/dtos/weight-record.dto';
import { weightRecord } from '@/src/domain/entities/weight-record.entity';

// Mock del mapper
jest.mock('@/src/application/mappers/weight-record.mapper');

describe('AddWeightRecordUseCase', () => {
  let useCase: AddWeightRecordUseCase;
  let mockRepository: jest.Mocked<weightRecordRepository>;
  
  const mockPetId = '987fcdeb-51a2-43d7-9b56-2546b7a3c8e9';
  const mockWeight = 5.5;
  const mockDate = '2026-07-29';
  const mockNote = 'Peso después del baño';
  const mockRecordId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCreatedAt = new Date('2026-07-29T10:00:00Z');

  const mockCreateDto: CreateWeightRecordDto = {
    petId: mockPetId,
    weight: mockWeight,
    date: mockDate,
    note: mockNote,
  };

  const mockDomainRecord = weightRecord.create({
    id: mockRecordId,
    petId: mockPetId,
    weight: mockWeight,
    date: new Date(mockDate),
    note: mockNote,
  });

  const mockResponseDto: weightRecordResponseDto = {
    message: 'WeightRecord creado correctamente',
    id: mockRecordId,
    petId: mockPetId,
    weight: mockWeight,
    date: mockDate,
    note: mockNote,
    createdAt: mockCreatedAt.toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Crear mock del repositorio
    mockRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findByPetId: jest.fn(),
      getLatestByPetId: jest.fn(),
      updateWeightByPetId: jest.fn(),
    };

    // Mock del mapper
    (weightRecordMapper.toDomain as jest.Mock).mockReturnValue(mockDomainRecord);

    useCase = new AddWeightRecordUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should successfully create and save a weight record', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(mockResponseDto);

      // Act
      const result = await useCase.execute(mockCreateDto);

      // Assert
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(mockCreateDto);
      expect(weightRecordMapper.toDomain).toHaveBeenCalledTimes(1);
      
      expect(mockRepository.save).toHaveBeenCalledWith(mockDomainRecord);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle creation without optional fields', async () => {
      // Arrange
      const minimalDto: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: mockWeight,
      };

      const minimalDomainRecord = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
      });

      const minimalResponse: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(minimalDomainRecord);
      mockRepository.save.mockResolvedValueOnce(minimalResponse);

      // Act
      const result = await useCase.execute(minimalDto);

      // Assert
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(minimalDto);
      expect(mockRepository.save).toHaveBeenCalledWith(minimalDomainRecord);
      expect(result).toEqual(minimalResponse);
      expect(result.date).toBeUndefined();
      expect(result.note).toBeUndefined();
    });

    it('should handle creation with date only', async () => {
      // Arrange
      const dtoWithDateOnly: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
      };

      const domainRecordWithDate = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
        date: new Date(mockDate),
      });

      const responseWithDate: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithDate);
      mockRepository.save.mockResolvedValueOnce(responseWithDate);

      // Act
      const result = await useCase.execute(dtoWithDateOnly);

      // Assert
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(dtoWithDateOnly);
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithDate);
      expect(result).toEqual(responseWithDate);
      expect(result.date).toBe(mockDate);
      expect(result.note).toBeUndefined();
    });

    it('should handle creation with note only', async () => {
      // Arrange
      const dtoWithNoteOnly: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: mockWeight,
        note: mockNote,
      };

      const domainRecordWithNote = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
        note: mockNote,
      });

      const responseWithNote: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        note: mockNote,
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithNote);
      mockRepository.save.mockResolvedValueOnce(responseWithNote);

      // Act
      const result = await useCase.execute(dtoWithNoteOnly);

      // Assert
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(dtoWithNoteOnly);
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithNote);
      expect(result).toEqual(responseWithNote);
      expect(result.date).toBeUndefined();
      expect(result.note).toBe(mockNote);
    });

    it('should handle decimal weight values', async () => {
      // Arrange
      const dtoWithDecimal: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: 5.75,
        note: 'Peso con decimales',
      };

      const domainRecordWithDecimal = weightRecord.create({
        petId: mockPetId,
        weight: 5.75,
        note: 'Peso con decimales',
      });

      const responseWithDecimal: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: 5.75,
        note: 'Peso con decimales',
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithDecimal);
      mockRepository.save.mockResolvedValueOnce(responseWithDecimal);

      // Act
      const result = await useCase.execute(dtoWithDecimal);

      // Assert
      expect(result.weight).toBe(5.75);
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithDecimal);
    });

    it('should propagate errors from the repository', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      mockRepository.save.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute(mockCreateDto)).rejects.toThrow(errorMessage);
      
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(mockCreateDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockDomainRecord);
    });

    it('should propagate errors from the mapper', async () => {
      // Arrange
      const errorMessage = 'Invalid DTO data';
      (weightRecordMapper.toDomain as jest.Mock).mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // Act & Assert
      await expect(useCase.execute(mockCreateDto)).rejects.toThrow(errorMessage);
      
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith(mockCreateDto);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle empty note string', async () => {
      // Arrange
      const dtoWithEmptyNote: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: mockWeight,
        note: '',
      };

      const domainRecordWithEmptyNote = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
        note: '',
      });

      const responseWithEmptyNote: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        note: '',
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithEmptyNote);
      mockRepository.save.mockResolvedValueOnce(responseWithEmptyNote);

      // Act
      const result = await useCase.execute(dtoWithEmptyNote);

      // Assert
      expect(result.note).toBe('');
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithEmptyNote);
    });

    it('should handle very large weight values', async () => {
      // Arrange
      const largeWeight = 99999.99;
      const dtoWithLargeWeight: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: largeWeight,
      };

      const domainRecordWithLargeWeight = weightRecord.create({
        petId: mockPetId,
        weight: largeWeight,
      });

      const responseWithLargeWeight: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: largeWeight,
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithLargeWeight);
      mockRepository.save.mockResolvedValueOnce(responseWithLargeWeight);

      // Act
      const result = await useCase.execute(dtoWithLargeWeight);

      // Assert
      expect(result.weight).toBe(largeWeight);
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithLargeWeight);
    });

    it('should handle very small positive weight values', async () => {
      // Arrange
      const smallWeight = 0.001;
      const dtoWithSmallWeight: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: smallWeight,
      };

      const domainRecordWithSmallWeight = weightRecord.create({
        petId: mockPetId,
        weight: smallWeight,
      });

      const responseWithSmallWeight: weightRecordResponseDto = {
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: smallWeight,
        createdAt: mockCreatedAt.toISOString(),
      };

      (weightRecordMapper.toDomain as jest.Mock).mockReturnValueOnce(domainRecordWithSmallWeight);
      mockRepository.save.mockResolvedValueOnce(responseWithSmallWeight);

      // Act
      const result = await useCase.execute(dtoWithSmallWeight);

      // Assert
      expect(result.weight).toBe(smallWeight);
      expect(mockRepository.save).toHaveBeenCalledWith(domainRecordWithSmallWeight);
    });
  });

  describe('integration with mapper', () => {
    it('should use the mapper to convert DTO to domain entity', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(mockResponseDto);

      // Act
      await useCase.execute(mockCreateDto);

      // Assert
      expect(weightRecordMapper.toDomain).toHaveBeenCalledWith({
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        note: mockNote,
      });
    });

    it('should pass the domain entity to the repository', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(mockResponseDto);

      // Act
      await useCase.execute(mockCreateDto);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          weight: mockWeight,
        })
      );
    });
  });

  describe('validation scenarios', () => {
    it('should handle missing petId', async () => {
      // Arrange
      const invalidDto = {
        weight: mockWeight,
      } as CreateWeightRecordDto;

      const errorMessage = 'PetId is required';
      (weightRecordMapper.toDomain as jest.Mock).mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // Act & Assert
      await expect(useCase.execute(invalidDto)).rejects.toThrow(errorMessage);
    });

    it('should handle missing weight', async () => {
      // Arrange
      const invalidDto = {
        petId: mockPetId,
      } as CreateWeightRecordDto;

      const errorMessage = 'Weight is required';
      (weightRecordMapper.toDomain as jest.Mock).mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // Act & Assert
      await expect(useCase.execute(invalidDto)).rejects.toThrow(errorMessage);
    });

    it('should handle invalid date format', async () => {
      // Arrange
      const invalidDto: CreateWeightRecordDto = {
        petId: mockPetId,
        weight: mockWeight,
        date: 'invalid-date',
      };

      const errorMessage = 'Invalid date format';
      (weightRecordMapper.toDomain as jest.Mock).mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // Act & Assert
      await expect(useCase.execute(invalidDto)).rejects.toThrow(errorMessage);
    });
  });

  describe('repository error handling', () => {
    it('should handle duplicate record error', async () => {
      // Arrange
      const errorMessage = 'Duplicate record found';
      mockRepository.save.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute(mockCreateDto)).rejects.toThrow(errorMessage);
    });

    it('should handle constraint violation error', async () => {
      // Arrange
      const errorMessage = 'Foreign key constraint violation';
      mockRepository.save.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute(mockCreateDto)).rejects.toThrow(errorMessage);
    });

    it('should handle timeout error', async () => {
      // Arrange
      const errorMessage = 'Database timeout';
      mockRepository.save.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute(mockCreateDto)).rejects.toThrow(errorMessage);
    });
  });

  describe('response mapping', () => {
    it('should return the response DTO from repository', async () => {
      // Arrange
      const customResponse: weightRecordResponseDto = {
        message: 'Custom message',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        note: mockNote,
        createdAt: mockCreatedAt.toISOString(),
      };
      mockRepository.save.mockResolvedValueOnce(customResponse);

      // Act
      const result = await useCase.execute(mockCreateDto);

      // Assert
      expect(result).toBe(customResponse);
      expect(result.message).toBe('Custom message');
    });

    it('should preserve all fields in response', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(mockResponseDto);

      // Act
      const result = await useCase.execute(mockCreateDto);

      // Assert
      expect(result).toMatchObject({
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        note: mockNote,
        createdAt: expect.any(String),
      });
    });
  });
});