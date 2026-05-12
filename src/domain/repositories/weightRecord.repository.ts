import { weightRecord } from '../entities/weightRecord.entity';
import { weightRecordListResponseDto, weightRecordResponseDto, weightRecordByPetIdResponseDto } from '@/src/application/dtos/weightRecord.dto';

export interface weightRecordRepository {
  save(record: weightRecord): Promise<weightRecordResponseDto>;
  findAll(): Promise <weightRecordListResponseDto[]>;
  findByPetId(petId: string): Promise<weightRecordByPetIdResponseDto[]>;
  updateWeightByPetId(petId: string, weight: number): Promise<weightRecordResponseDto>;
}