import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { WeightRecordByPetIdResponseDto } from '@/src/application/dtos/weight-record.dto';

export class GetWeightRecordsByPetIdUseCase {
  constructor(private readonly weightRecordRepository: weightRecordRepository) {}

  async execute(petId: string): Promise<WeightRecordByPetIdResponseDto[]> {
    if (!petId) {
      throw new Error('petId es requerido');
    }
    return await this.weightRecordRepository.findByPetId(petId);
  }
}