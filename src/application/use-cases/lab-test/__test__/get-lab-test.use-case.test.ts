// __tests__/application/use-cases/lab-test/get-lab-test.use-case.test.ts
import { GetLabTestsByVisitIdUseCase } from '@/src/application/use-cases/lab-test/get-lab-test.use-case';
import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';

describe('GetLabTestsByVisitIdUseCase', () => {
  let useCase: GetLabTestsByVisitIdUseCase;
  let mockRepository: jest.Mocked<LabTestRepository>;

  const mockLabTests = [
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
    }
  ];

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByVisistId: jest.fn(),
      updateResultByVisitId: jest.fn()
    };
    useCase = new GetLabTestsByVisitIdUseCase(mockRepository);
  });

  it('should get lab tests by visit_id successfully', async () => {
    mockRepository.findByVisistId.mockResolvedValue(mockLabTests);

    const result = await useCase.execute('vis-456');

    expect(result).toEqual(mockLabTests);
    expect(mockRepository.findByVisistId).toHaveBeenCalledWith('vis-456');
  });

  it('should throw error if visit_id is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow('visit_id es requerido');
  });

  it('should propagate repository errors', async () => {
    const error = new Error('Repository error');
    mockRepository.findByVisistId.mockRejectedValue(error);

    await expect(useCase.execute('vis-456')).rejects.toThrow('Repository error');
  });

  it('should return empty array when no tests found', async () => {
    mockRepository.findByVisistId.mockResolvedValue([]);

    const result = await useCase.execute('vis-456');
    expect(result).toEqual([]);
  });
});