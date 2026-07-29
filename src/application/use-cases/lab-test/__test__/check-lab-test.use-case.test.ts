// __tests__/application/use-cases/lab-test/check-lab-test.use-case.test.ts
import { CheckLabTestIsNormalUseCase } from '@/src/application/use-cases/lab-test/check-lab-test.use-case';
import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { labTestListResponseDto } from '@/src/application/dtos/lab-test.dto';

describe('CheckLabTestIsNormalUseCase', () => {
  let useCase: CheckLabTestIsNormalUseCase;
  let mockRepository: jest.Mocked<LabTestRepository>;

  const mockLabTests: labTestListResponseDto[] = [
    {
      id: '1',
      visit_id: 'vis-456',
      name: 'Glucosa',
      result: '95',
      normal_range: '70-100',
      created_at: '2026-07-29'
    },
    {
      id: '2',
      visit_id: 'vis-456',
      name: 'Colesterol',
      result: '180',
      normal_range: '<200',
      created_at: '2026-07-29'
    },
    {
      id: '3',
      visit_id: 'vis-456',
      name: 'Hierro',
      result: '15',
      normal_range: '>10',
      created_at: '2026-07-29'
    }
  ];

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByVisistId: jest.fn(),
      updateResultByVisitId: jest.fn()
    };
    useCase = new CheckLabTestIsNormalUseCase(mockRepository);
  });

  describe('parseIsNormal', () => {
    it('should return true for range with max value', () => {
      const result = useCase['parseIsNormal']('150', '<200');
      expect(result).toBe(true);
    });

    it('should return false for range with max value', () => {
      const result = useCase['parseIsNormal']('250', '<200');
      expect(result).toBe(false);
    });

    it('should return true for range with min value', () => {
      const result = useCase['parseIsNormal']('15', '>10');
      expect(result).toBe(true);
    });

    it('should return false for range with min value', () => {
      const result = useCase['parseIsNormal']('5', '>10');
      expect(result).toBe(false);
    });

    it('should return true for range between values', () => {
      const result = useCase['parseIsNormal']('85', '70-100');
      expect(result).toBe(true);
    });

    it('should return false for range between values', () => {
      const result = useCase['parseIsNormal']('120', '70-100');
      expect(result).toBe(false);
    });

    it('should return false for non-numeric result', () => {
      const result = useCase['parseIsNormal']('positivo', 'negativo');
      expect(result).toBe(false);
    });

    it('should return false for empty result', () => {
      const result = useCase['parseIsNormal']('', '70-100');
      expect(result).toBe(false);
    });

    it('should return false for invalid range format', () => {
      const result = useCase['parseIsNormal']('95', 'invalid range');
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should check all lab tests and return is_normal status', async () => {
      mockRepository.findByVisistId.mockResolvedValue(mockLabTests);

      const result = await useCase.execute('vis-456');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'Glucosa',
        result: '95',
        normal_range: '70-100',
        is_normal: true
      });
      expect(result[1]).toEqual({
        name: 'Colesterol',
        result: '180',
        normal_range: '<200',
        is_normal: true
      });
      expect(result[2]).toEqual({
        name: 'Hierro',
        result: '15',
        normal_range: '>10',
        is_normal: true
      });
      expect(mockRepository.findByVisistId).toHaveBeenCalledWith('vis-456');
    });

    it('should return is_normal false for abnormal results', async () => {
      const abnormalTests: labTestListResponseDto[] = [
        {
          ...mockLabTests[0],
          result: '120'
        }
      ];
      mockRepository.findByVisistId.mockResolvedValue(abnormalTests);

      const result = await useCase.execute('vis-456');
      expect(result[0].is_normal).toBe(false);
    });

    it('should handle undefined result and normal_range', async () => {
      const testsWithUndefined: labTestListResponseDto[] = [
        {
          ...mockLabTests[0],
          result: undefined,
          normal_range: undefined
        }
      ];
      mockRepository.findByVisistId.mockResolvedValue(testsWithUndefined);

      const result = await useCase.execute('vis-456');
      expect(result[0].is_normal).toBe(false);
    });

    it('should handle empty result and normal_range', async () => {
      const testsWithEmpty: labTestListResponseDto[] = [
        {
          ...mockLabTests[0],
          result: '',
          normal_range: ''
        }
      ];
      mockRepository.findByVisistId.mockResolvedValue(testsWithEmpty);

      const result = await useCase.execute('vis-456');
      expect(result[0].is_normal).toBe(false);
    });

    it('should throw error if visit_id is missing', async () => {
      await expect(useCase.execute('')).rejects.toThrow('visit_id es requerido');
    });

    it('should throw error if visit_id is null or undefined', async () => {
      await expect(useCase.execute(null as unknown as string)).rejects.toThrow('visit_id es requerido');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Repository error');
      mockRepository.findByVisistId.mockRejectedValue(error);

      await expect(useCase.execute('vis-456')).rejects.toThrow('Repository error');
    });

    it('should return empty array when no lab tests found', async () => {
      mockRepository.findByVisistId.mockResolvedValue([]);

      const result = await useCase.execute('vis-456');
      expect(result).toEqual([]);
      expect(mockRepository.findByVisistId).toHaveBeenCalledWith('vis-456');
    });
  });
});