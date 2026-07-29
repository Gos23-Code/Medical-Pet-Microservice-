import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { weightRecordByPetIdResponseDto } from '@/src/application/dtos/weight-record.dto';

export class GetLatestWeightRecordByPetIdUseCase {
  constructor(private readonly weightRecordRepository: weightRecordRepository) {}

  async execute(petId: string): Promise<weightRecordByPetIdResponseDto> {
    if (!petId) {
      throw new Error('petId es requerido');
    }
    return await this.weightRecordRepository.getLatestByPetId(petId);
  }
}