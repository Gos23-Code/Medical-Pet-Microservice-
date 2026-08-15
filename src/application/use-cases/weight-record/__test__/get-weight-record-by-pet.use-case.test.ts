import { GetWeightRecordsByPetIdUseCase } from '@/src/application/use-cases/weight-record/get-weigh-record-by-pet.use-case';
import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';

const mockData = [
  { petId: 'uuid-1', weight: 4.5 },
  { petId: 'uuid-1', weight: 5.0 },
];

const mockRepository: weightRecordRepository = {
  save: jest.fn(),
  findAll: jest.fn(),
  findByPetId: jest.fn().mockResolvedValue(mockData),
  getLatestByPetId: jest.fn(),
  updateWeightByPetId: jest.fn(),
};

describe('GetWeightRecordsByPetIdUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  //Devuelve los registros correctamente
  it('Devuelve los registros de weight de una mascota', async () => {
    const useCase = new GetWeightRecordsByPetIdUseCase(mockRepository);
    const result = await useCase.execute('uuid-1');
    expect(result).toEqual(mockData);
    expect(result).toHaveLength(2);
  });

  //Verifica si petId correcto al repositorio
  it('Llama a findByPetId con el petId correcto', async () => {
    const useCase = new GetWeightRecordsByPetIdUseCase(mockRepository);
    await useCase.execute('uuid-1');

    expect(mockRepository.findByPetId).toHaveBeenCalledWith('uuid-1');
  });

  //Llama al repositorio
  it('Invoca al repositorio', async () => {
    const useCase = new GetWeightRecordsByPetIdUseCase(mockRepository);
    await useCase.execute('uuid-1');

    expect(mockRepository.findByPetId).toHaveBeenCalledTimes(1);
  });

  //lanzar error si el petId esta vacio
  it('Debe lanzar error si petId esta vacio', async () => {
    const useCase = new GetWeightRecordsByPetIdUseCase(mockRepository);

    await expect(
      useCase.execute('')
    ).rejects.toThrow('petId es requerido');
  });

  //Lanza un error si no se encuenta un registro en la bd
  it('Debe lanzar error si el repositorio falla', async () => {
    const failRepository: weightRecordRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findByPetId: jest.fn().mockRejectedValue(
        new Error('No se encontraron registros para petId')
      ),
      getLatestByPetId: jest.fn(),
      updateWeightByPetId: jest.fn(),
    };

    const useCase = new GetWeightRecordsByPetIdUseCase(failRepository);

    await expect(
      useCase.execute('uuid-3')
    ).rejects.toThrow('No se encontraron registros para petId');
  });

});