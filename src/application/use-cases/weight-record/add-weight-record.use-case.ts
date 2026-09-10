import { weightRecordMapper } from "@/src/application/mappers/weight-record.mapper";
import { CreateWeightRecordDto, WeightRecordResponseDto } from "@/src/application/dtos/weight-record.dto";
import { weightRecordRepository } from "@/src/domain/repositories/weight-record.repository";

export class AddWeightRecordUseCase {
  constructor(
    private readonly weightRecordRepository: weightRecordRepository
  ){}

  async execute(dto: CreateWeightRecordDto): Promise<WeightRecordResponseDto> {
    const record = weightRecordMapper.toDomain(dto);
    const saved = await this.weightRecordRepository.save(record);
    return saved;
    
  }
}