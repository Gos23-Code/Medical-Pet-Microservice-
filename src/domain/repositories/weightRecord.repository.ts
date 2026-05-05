import { weightRecord } from '../entities/weightRecord.entity';

export interface weightRecordRepository {
  save(record: weightRecord): Promise<weightRecord>;
}