import { UpdateWeightRecordUseCase } from '@/src/application/use-cases/weight-record/update-weight-record.use-case';
import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';

const mockRepository: weightRecordRepository = {
  save: jest.fn(),
  findAll: jest.fn(),
  findByPetId: jest.fn(),
  getLatestByPetId: jest.fn(),
  updateWeightByPetId: jest.fn().mockResolvedValue({
    message: 'Peso actualizado',
    id: '278f0019-4024-49be-9219-8e1691b64fdc',
    petId: 'uuid-1',
    weight: 5.1,
    createdAt: new Date().toISOString(),
  }),
};

describe('UpdateWeightRecordUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Actualiza
  it('Debe actualizar el peso y devolver el registro actualizado', async () => {
    const useCase = new UpdateWeightRecordUseCase(mockRepository);

    const result = await useCase.execute(
      'uuid-1',
      { weight: 5.1 }
    );

    expect(result.message).toBe('Peso actualizado');
    expect(result.weight).toBe(5.1);
  });

  //llama al repositorio
  it('Debe llamar a updateWeightByPetId con petId y weight correctos', async () => {
    const useCase = new UpdateWeightRecordUseCase(mockRepository);

    await useCase.execute(
      'uuid-1',
      { weight: 5.1 }
    );

    expect(mockRepository.updateWeightByPetId).toHaveBeenCalledWith(
      'uuid-1',
      5.1
    );
  });

  //lama al repositorio una vez
  it('Llamar al repositorio', async () => {
    const useCase = new UpdateWeightRecordUseCase(mockRepository);

    await useCase.execute(
      'uuid-1',
      { weight: 5.1 }
    );

    expect(mockRepository.updateWeightByPetId).toHaveBeenCalledTimes(1);
  });

  //lanza error si weight es 0
  it('Debe lanzar error si el peso es 0', async () => {
    const useCase = new UpdateWeightRecordUseCase(mockRepository);

    await expect(
      useCase.execute('uuid-1', { weight: 0 })
    ).rejects.toThrow('El peso debe ser mayor a 0');
  });

  //lanza error si weight es negativo
  it('Debe lanzar error si el peso es negativo', async () => {
    const useCase = new UpdateWeightRecordUseCase(mockRepository);

    await expect(
      useCase.execute('uuid-1', { weight: -1 })
    ).rejects.toThrow('El peso debe ser mayor a 0');
  });

  //lanza error si el repositorio falla
  it('Debe lanzar error si el repositorio falla', async () => {
    const failRepository: weightRecordRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findByPetId: jest.fn(),
      getLatestByPetId: jest.fn(),
      updateWeightByPetId: jest.fn().mockRejectedValue(
        new Error('No se encontró ningún WeightRecord con petId')
      ),
    };

    const useCase = new UpdateWeightRecordUseCase(failRepository);

    await expect(
      useCase.execute('uuid-1', { weight: 5.1 })
    ).rejects.toThrow('No se encontró ningún WeightRecord con petId');
  });

});