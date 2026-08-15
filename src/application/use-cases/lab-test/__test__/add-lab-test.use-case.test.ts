// __tests__/application/use-cases/lab-test/add-lab-test.use-case.test.ts
import { AddLabTestUseCase } from '@/src/application/use-cases/lab-test/add-lab-test.use-case';
import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { LabTestMapper } from '@/src/application/mappers/lab-test.mapper';

jest.mock('@/src/application/mappers/lab-test.mapper');

describe('AddLabTestUseCase', () => {
  let useCase: AddLabTestUseCase;
  let mockRepository: jest.Mocked<LabTestRepository>;

  const mockDto = {
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '95',
    normal_range: '70-100'
  };

  const mockLabTest = {
    id: 'test-123',
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '95',
    normal_range: '70-100',
    created_at: new Date()
  };

  const mockResponse = {
    message: 'LabTest creado',
    id: 'test-123',
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '95',
    normal_range: '70-100',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByVisistId: jest.fn(),
      updateResultByVisitId: jest.fn()
    };
    useCase = new AddLabTestUseCase(mockRepository);
    (LabTestMapper.toDomain as jest.Mock).mockReturnValue(mockLabTest);
  });

  it('should create and save a lab test successfully', async () => {
    mockRepository.save.mockResolvedValue(mockResponse);

    const result = await useCase.execute(mockDto);

    expect(LabTestMapper.toDomain).toHaveBeenCalledWith(mockDto);
    expect(mockRepository.save).toHaveBeenCalledWith(mockLabTest);
    expect(result).toEqual(mockResponse);
  });

  it('should throw error if repository save fails', async () => {
    const error = new Error('Repository error');
    mockRepository.save.mockRejectedValue(error);

    await expect(useCase.execute(mockDto)).rejects.toThrow('Repository error');
  });
});