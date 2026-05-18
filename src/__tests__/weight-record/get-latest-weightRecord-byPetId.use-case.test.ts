import { GetLatestWeightRecordByPetIdUseCase } from '@/src/application/use-cases/get-latest-weightRecord-byPetId.use-case';
import { weightRecordRepository } from '@/src/domain/repositories/weightRecord.repository';

const mockLatest = {
  petId: 'uuid-1',
  weight: 5.1,
};

//Devuelve el mas reciente
const mockRepository: weightRecordRepository = {
  save: jest.fn(),
  findAll: jest.fn(),
  findByPetId: jest.fn(),
  getLatestByPetId: jest.fn().mockResolvedValue(mockLatest),
  updateWeightByPetId: jest.fn(),
};

describe('GetLatestWeightRecordByPetIdUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verifica petId y Weight
  it('Debe devolver el último wight', async () => {
    const useCase = new GetLatestWeightRecordByPetIdUseCase(mockRepository);
    const result = await useCase.execute('uuid-1');

    expect(result).toEqual(mockLatest);
    expect(result.petId).toBe('uuid-1');
    expect(result.weight).toBe(5.1);
  });

  //PetId correcto
  it('Debe llamar a getLatestByPetId con el petId correcto', async () => {
    const useCase = new GetLatestWeightRecordByPetIdUseCase(mockRepository);
    await useCase.execute('uuid-1');

    expect(mockRepository.getLatestByPetId).toHaveBeenCalledWith('uuid-1');
  });

  //LLama al repositorio
  it('debe llamar al repositorio una sola vez', async () => {
    const useCase = new GetLatestWeightRecordByPetIdUseCase(mockRepository);
    await useCase.execute('uuid-1');

    expect(mockRepository.getLatestByPetId).toHaveBeenCalledTimes(1);
  });

  // Si PetId esta vacio debe lanzar error
  it('Debe lanzar error si petId está vacío', async () => {
    const useCase = new GetLatestWeightRecordByPetIdUseCase(mockRepository);

    await expect(
      useCase.execute('')
    ).rejects.toThrow('petId es requerido');
  });

  //Si no esta el ulrimo registro lanza error
  it('Debe lanzar error si el repositorio falla', async () => {
    const failRepository: weightRecordRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findByPetId: jest.fn(),
      getLatestByPetId: jest.fn().mockRejectedValue(
        new Error('Error obteniendo último peso')
      ),
      updateWeightByPetId: jest.fn(),
    };

    const useCase = new GetLatestWeightRecordByPetIdUseCase(failRepository);

    await expect(
      useCase.execute('uuid-3')
    ).rejects.toThrow('Error obteniendo último peso');
  });

});