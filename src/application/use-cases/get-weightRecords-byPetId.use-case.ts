import { weightRecordRepository } from '../../domain/repositories/weightRecord.repository';
import { weightRecordByPetIdResponseDto } from '../dtos/weightRecord.dto';

export class GetWeightRecordsByPetIdUseCase {
  constructor(private readonly weightRecordRepository: weightRecordRepository) {}

  async execute(petId: string): Promise<weightRecordByPetIdResponseDto[]> {
    if (!petId) {
      throw new Error('petId es requerido');
    }
    return await this.weightRecordRepository.findByPetId(petId);
  }
}