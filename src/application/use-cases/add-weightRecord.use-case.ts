import { weightRecordMapper } from "../mappers/weightRecord.mapper";
import { CreateWeightRecordDto, weightRecordResponseDto } from "../dtos/weightRecord.dto";
import { weightRecordRepository } from "@/src/domain/repositories/weightRecord.repository";

export class AddWeightRecordUseCase {
  constructor(
    private readonly weightRecordRepository: weightRecordRepository
  ){}

  async execute(dto: CreateWeightRecordDto): Promise<weightRecordResponseDto> {
    const record = weightRecordMapper.toDomain(dto);
    const saved = await this.weightRecordRepository.save(record);
    return saved;
    
  }
}