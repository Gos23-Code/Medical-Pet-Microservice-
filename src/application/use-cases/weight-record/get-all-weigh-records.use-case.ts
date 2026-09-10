import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { WeightRecordListResponseDto } from '@/src/application/dtos/weight-record.dto';

export class GetAllWeightRecordsUseCase {
  constructor(
    private readonly weightRecordRepository: weightRecordRepository
  ) {}

  async execute(): Promise<WeightRecordListResponseDto[]> {
    return await this.weightRecordRepository.findAll();
  }
}