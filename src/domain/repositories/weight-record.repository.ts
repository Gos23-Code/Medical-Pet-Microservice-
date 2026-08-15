import { weightRecord } from '@/src/domain/entities/weight-record.entity';
import { weightRecordListResponseDto,
        weightRecordResponseDto,
        weightRecordByPetIdResponseDto,
        weightRecordLatestResponseDto
       } from '@/src/application/dtos/weight-record.dto';

export interface weightRecordRepository {
  save(record: weightRecord): Promise<weightRecordResponseDto>;
  findAll(): Promise <weightRecordListResponseDto[]>;
  findByPetId(petId: string): Promise<weightRecordByPetIdResponseDto[]>;
  getLatestByPetId(petId: string): Promise<weightRecordLatestResponseDto>;
  updateWeightByPetId(petId: string, weight: number): Promise<weightRecordResponseDto>;
}