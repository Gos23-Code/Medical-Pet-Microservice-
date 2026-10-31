import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { WeightRecordLatestResponseDto } from '@/src/application/dtos/weight-record.dto';

export class GetLatestWeightRecordByPetIdUseCase {
  constructor(private readonly weightRecordRepository: weightRecordRepository) {}

  // null = la mascota todavía no tiene pesos registrados
  async execute(petId: string): Promise<WeightRecordLatestResponseDto | null> {
    if (!petId) {
      throw new Error('petId es requerido');
    }
    return await this.weightRecordRepository.getLatestByPetId(petId);
  }
}