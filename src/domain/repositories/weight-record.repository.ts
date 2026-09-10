import { weightRecord } from '@/src/domain/entities/weight-record.entity';
import { WeightRecordListResponseDto,
        WeightRecordResponseDto,
        WeightRecordByPetIdResponseDto,
        WeightRecordLatestResponseDto
       } from '@/src/application/dtos/weight-record.dto';

export interface weightRecordRepository {
  save(record: weightRecord): Promise<WeightRecordResponseDto>;
  findAll(): Promise <WeightRecordListResponseDto[]>;
  findByPetId(petId: string): Promise<WeightRecordByPetIdResponseDto[]>;
  getLatestByPetId(petId: string): Promise<WeightRecordLatestResponseDto>;
  updateWeightByPetId(petId: string, weight: number): Promise<WeightRecordResponseDto>;
}