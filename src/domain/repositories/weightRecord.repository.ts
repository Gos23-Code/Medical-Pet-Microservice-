import { weightRecord } from '../entities/weightRecord.entity';
import { weightRecordListResponseDto, weightRecordResponseDto } from '@/src/application/dtos/weightRecord.dto';

export interface weightRecordRepository {
  save(record: weightRecord): Promise<weightRecordResponseDto>;
  findAll(): Promise <weightRecordListResponseDto[]>;
  updateWeightByPetId(petId: string, weight: number): Promise<weightRecordResponseDto>;
}