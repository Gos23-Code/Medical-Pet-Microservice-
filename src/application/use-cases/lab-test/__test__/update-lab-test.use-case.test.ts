// __tests__/application/use-cases/lab-test/update-lab-test.use-case.test.ts
import { UpdateLabTestResultUseCase } from '@/src/application/use-cases/lab-test/update-lab-test.use.case';
import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { UpdateLabTestResultDto, LabTestResponseDto } from '@/src/application/dtos/lab-test.dto';

describe('UpdateLabTestResultUseCase', () => {
  let useCase: UpdateLabTestResultUseCase;
  let mockRepository: jest.Mocked<LabTestRepository>;

  const mockDto: UpdateLabTestResultDto = {
    result: '98'
  };

  const mockResponse: LabTestResponseDto = {
    message: 'Resultado actualizado',
    id: 'test-123',
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '98',
    normal_range: '70-100',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByVisistId: jest.fn(),
      updateResultByVisitId: jest.fn()
    };
    useCase = new UpdateLabTestResultUseCase(mockRepository);
  });

  it('should update result successfully', async () => {
    mockRepository.updateResultByVisitId.mockResolvedValue(mockResponse);

    const result = await useCase.execute('vis-456', mockDto);

    expect(result).toEqual(mockResponse);
    expect(mockRepository.updateResultByVisitId).toHaveBeenCalledWith('vis-456', '98');
  });

  it('should throw error if visit_id is missing', async () => {
    await expect(useCase.execute('', mockDto)).rejects.toThrow('visit_id es requerido');
  });

  it('should throw error if visit_id is null', async () => {
    await expect(useCase.execute(null as unknown as string, mockDto)).rejects.toThrow('visit_id es requerido');
  });

  it('should throw error if visit_id is undefined', async () => {
    await expect(useCase.execute(undefined as unknown as string, mockDto)).rejects.toThrow('visit_id es requerido');
  });

  it('should throw error if result is missing in dto', async () => {
    // Crear un DTO inválido usando type assertion para simular la falta de result
    const invalidDto = { result: '' } as UpdateLabTestResultDto;
    await expect(useCase.execute('vis-456', invalidDto)).rejects.toThrow('result es requerido');
  });

  it('should throw error if result is empty string', async () => {
    const emptyResultDto: UpdateLabTestResultDto = { result: '' };
    await expect(useCase.execute('vis-456', emptyResultDto)).rejects.toThrow('result es requerido');
  });

  it('should throw error if result is null', async () => {
    const nullResultDto = { result: null as unknown as string } as UpdateLabTestResultDto;
    await expect(useCase.execute('vis-456', nullResultDto)).rejects.toThrow('result es requerido');
  });

  it('should propagate repository errors', async () => {
    const error = new Error('Repository error');
    mockRepository.updateResultByVisitId.mockRejectedValue(error);

    await expect(useCase.execute('vis-456', mockDto)).rejects.toThrow('Repository error');
  });

  it('should handle successful update with different result values', async () => {
    const testCases = [
      { result: '100', expected: '100' },
      { result: '0', expected: '0' },
      { result: '-5', expected: '-5' },
      { result: '123.45', expected: '123.45' }
    ];

    for (const testCase of testCases) {
      const dto: UpdateLabTestResultDto = { result: testCase.result };
      const response: LabTestResponseDto = {
        ...mockResponse,
        result: testCase.expected
      };
      
      mockRepository.updateResultByVisitId.mockResolvedValue(response);
      
      const result = await useCase.execute('vis-456', dto);
      expect(result.result).toBe(testCase.expected);
      expect(mockRepository.updateResultByVisitId).toHaveBeenCalledWith('vis-456', testCase.result);
    }
  });

  it('should handle repository returning null response', async () => {
    // Esto podría pasar si el repositorio no encuentra el registro
    mockRepository.updateResultByVisitId.mockResolvedValue(null as unknown as LabTestResponseDto);

    const result = await useCase.execute('vis-456', mockDto);
    expect(result).toBeNull();
  });
});