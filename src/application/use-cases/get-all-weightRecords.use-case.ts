import { weightRecordRepository } from '../../domain/repositories/weightRecord.repository';
import { weightRecordListResponseDto } from '../dtos/weightRecord.dto';

export class GetAllWeightRecordsUseCase {
  constructor(
    private readonly weightRecordRepository: weightRecordRepository
  ) {}

  async execute(): Promise<weightRecordListResponseDto[]> {
    return await this.weightRecordRepository.findAll();
  }
}