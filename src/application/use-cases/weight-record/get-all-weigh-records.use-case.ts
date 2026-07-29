import { weightRecordRepository } from '@/src/domain/repositories/weight-record.repository';
import { weightRecordListResponseDto } from '@/src/application/dtos/weight-record.dto';

export class GetAllWeightRecordsUseCase {
  constructor(
    private readonly weightRecordRepository: weightRecordRepository
  ) {}

  async execute(): Promise<weightRecordListResponseDto[]> {
    return await this.weightRecordRepository.findAll();
  }
}