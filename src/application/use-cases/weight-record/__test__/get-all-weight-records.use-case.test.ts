// get-all-weight-records.use-case.test.ts
import { GetAllWeightRecordsUseCase } from '../get-all-weigh-records.use-case';
import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { weightRecordListResponseDto } from '@/src/application/dtos/weight-record.dto';

describe('GetAllWeightRecordsUseCase', () => {
  let useCase: GetAllWeightRecordsUseCase;
  let mockRepository: jest.Mocked<weightRecordRepository>;

  const mockRecordId1 = '123e4567-e89b-12d3-a456-426614174000';
  const mockRecordId2 = '223e4567-e89b-12d3-a456-426614174001';
  const mockPetId1 = '987fcdeb-51a2-43d7-9b56-2546b7a3c8e9';
  const mockPetId2 = '887fcdeb-51a2-43d7-9b56-2546b7a3c8e8';
  const mockCreatedAt1 = new Date('2026-07-29T10:00:00Z');
  const mockCreatedAt2 = new Date('2026-07-28T15:30:00Z');

  const mockWeightRecords: weightRecordListResponseDto[] = [
    {
      id: mockRecordId1,
      petId: mockPetId1,
      weight: 5.5,
      date: '2026-07-29',
      note: 'Peso después del baño',
      createdAt: mockCreatedAt1.toISOString(),
    },
    {
      id: mockRecordId2,
      petId: mockPetId2,
      weight: 6.2,
      date: '2026-07-28',
      note: 'Peso antes de comer',
      createdAt: mockCreatedAt2.toISOString(),
    },
  ];

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

    useCase = new GetAllWeightRecordsUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return all weight records successfully', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue(mockWeightRecords);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWeightRecords);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no records exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return records sorted by date descending', async () => {
      // Arrange
      const sortedRecords = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 5.5,
          date: '2026-07-29',
          note: 'Peso más reciente',
          createdAt: mockCreatedAt1.toISOString(),
        },
        {
          id: mockRecordId2,
          petId: mockPetId2,
          weight: 6.2,
          date: '2026-07-28',
          note: 'Peso anterior',
          createdAt: mockCreatedAt2.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(sortedRecords);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].date).toBe('2026-07-29');
      expect(result[1].date).toBe('2026-07-28');
      expect(result[0].createdAt).toBe(mockCreatedAt1.toISOString());
    });

    it('should handle records with null optional fields', async () => {
      // Arrange
      const recordsWithNulls: weightRecordListResponseDto[] = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 5.5,
          createdAt: mockCreatedAt1.toISOString(),
        },
        {
          id: mockRecordId2,
          petId: mockPetId2,
          weight: 6.2,
          date: '2026-07-28',
          note: 'Solo nota',
          createdAt: mockCreatedAt2.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(recordsWithNulls);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].date).toBeUndefined();
      expect(result[0].note).toBeUndefined();
      expect(result[1].date).toBe('2026-07-28');
      expect(result[1].note).toBe('Solo nota');
    });

    it('should handle records with decimal weights', async () => {
      // Arrange
      const recordsWithDecimals: weightRecordListResponseDto[] = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 5.75,
          date: '2026-07-29',
          note: 'Peso con decimales',
          createdAt: mockCreatedAt1.toISOString(),
        },
        {
          id: mockRecordId2,
          petId: mockPetId2,
          weight: 6.33,
          date: '2026-07-28',
          note: 'Otro peso con decimales',
          createdAt: mockCreatedAt2.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(recordsWithDecimals);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].weight).toBe(5.75);
      expect(result[1].weight).toBe(6.33);
    });

    it('should handle large number of records', async () => {
      // Arrange
      const largeRecordsList: weightRecordListResponseDto[] = Array.from(
        { length: 100 },
        (_, index) => ({
          id: `record-${index}`,
          petId: `pet-${index}`,
          weight: 5 + index * 0.1,
          date: `2026-07-${29 - index}`,
          note: `Nota ${index}`,
          createdAt: new Date(2026, 6, 29 - index).toISOString(),
        })
      );
      mockRepository.findAll.mockResolvedValue(largeRecordsList);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toHaveLength(100);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should propagate errors from the repository', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      mockRepository.findAll.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(errorMessage);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle repository timeout error', async () => {
      // Arrange
      const errorMessage = 'Query timeout';
      mockRepository.findAll.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Query timeout');
    });

    it('should handle malformed data from repository', async () => {
      // Arrange
      const malformedData = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          // weight missing
          createdAt: mockCreatedAt1.toISOString(),
        },
      ] as weightRecordListResponseDto[];
      mockRepository.findAll.mockResolvedValue(malformedData);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].weight).toBeUndefined();
    });

    it('should handle empty strings in fields', async () => {
      // Arrange
      const recordsWithEmptyStrings: weightRecordListResponseDto[] = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 5.5,
          date: '',
          note: '',
          createdAt: mockCreatedAt1.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(recordsWithEmptyStrings);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].date).toBe('');
      expect(result[0].note).toBe('');
    });

    it('should handle very large weight values', async () => {
      // Arrange
      const recordsWithLargeWeights: weightRecordListResponseDto[] = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 99999.99,
          date: '2026-07-29',
          note: 'Peso muy grande',
          createdAt: mockCreatedAt1.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(recordsWithLargeWeights);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].weight).toBe(99999.99);
    });

    it('should handle very small positive weight values', async () => {
      // Arrange
      const recordsWithSmallWeights: weightRecordListResponseDto[] = [
        {
          id: mockRecordId1,
          petId: mockPetId1,
          weight: 0.001,
          date: '2026-07-29',
          note: 'Peso muy pequeño',
          createdAt: mockCreatedAt1.toISOString(),
        },
      ];
      mockRepository.findAll.mockResolvedValue(recordsWithSmallWeights);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].weight).toBe(0.001);
    });
  });

  describe('repository integration', () => {
    it('should call repository findAll method', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue(mockWeightRecords);

      // Act
      await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockRepository.findAll).toHaveBeenCalledWith();
    });

    it('should not call other repository methods', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue(mockWeightRecords);

      // Act
      await useCase.execute();

      // Assert
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockRepository.findByPetId).not.toHaveBeenCalled();
      expect(mockRepository.getLatestByPetId).not.toHaveBeenCalled();
      expect(mockRepository.updateWeightByPetId).not.toHaveBeenCalled();
    });

    it('should return the exact data from repository', async () => {
      // Arrange
      const expectedData = mockWeightRecords;
      mockRepository.findAll.mockResolvedValue(expectedData);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toBe(expectedData);
      expect(result).toStrictEqual(expectedData);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network connection lost');
      mockRepository.findAll.mockRejectedValueOnce(networkError);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Network connection lost');
    });

    it('should handle database constraint errors', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      mockRepository.findAll.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Constraint violation');
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error('Authentication failed');
      mockRepository.findAll.mockRejectedValueOnce(authError);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Authentication failed');
    });

    it('should handle permission errors', async () => {
      // Arrange
      const permissionError = new Error('Insufficient permissions');
      mockRepository.findAll.mockRejectedValueOnce(permissionError);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('data integrity', () => {
    it('should preserve all fields from repository', async () => {
      // Arrange
      const completeRecord: weightRecordListResponseDto = {
        id: mockRecordId1,
        petId: mockPetId1,
        weight: 5.5,
        date: '2026-07-29',
        note: 'Nota completa',
        createdAt: mockCreatedAt1.toISOString(),
      };
      mockRepository.findAll.mockResolvedValue([completeRecord]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0]).toEqual(completeRecord);
      expect(Object.keys(result[0])).toEqual(Object.keys(completeRecord));
    });

    it('should maintain data types', async () => {
      // Arrange
      const recordWithTypes: weightRecordListResponseDto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        petId: '987fcdeb-51a2-43d7-9b56-2546b7a3c8e9',
        weight: 5.5,
        date: '2026-07-29',
        note: 'Nota',
        createdAt: '2026-07-29T10:00:00Z',
      };
      mockRepository.findAll.mockResolvedValue([recordWithTypes]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(typeof result[0].id).toBe('string');
      expect(typeof result[0].petId).toBe('string');
      expect(typeof result[0].weight).toBe('number');
      expect(typeof result[0].date).toBe('string');
      expect(typeof result[0].note).toBe('string');
      expect(typeof result[0].createdAt).toBe('string');
    });
  });

  describe('performance considerations', () => {
    it('should handle concurrent calls', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue(mockWeightRecords);

      // Act
      const [result1, result2] = await Promise.all([
        useCase.execute(),
        useCase.execute(),
      ]);

      // Assert
      expect(result1).toEqual(mockWeightRecords);
      expect(result2).toEqual(mockWeightRecords);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should handle many records efficiently', async () => {
      // Arrange
      const manyRecords = Array.from({ length: 1000 }, (_, i) => ({
        id: `record-${i}`,
        petId: `pet-${i}`,
        weight: 5 + i * 0.1,
        date: `2026-07-${29 - (i % 30)}`,
        note: `Nota ${i}`,
        createdAt: new Date(2026, 6, 29 - i).toISOString(),
      }));
      mockRepository.findAll.mockResolvedValue(manyRecords);

      // Act
      const start = Date.now();
      const result = await useCase.execute();
      const end = Date.now();

      // Assert
      expect(result).toHaveLength(1000);
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});