import { LabTest } from '../entities/lab-test.entity';
import { labTestListResponseDto, LabTestResponseDto } from '@/src/application/dtos/lab-test.dto';

export interface LabTestRepository {
  save(labTest: LabTest): Promise<LabTestResponseDto>;
  findByVisistId(visit_id: string): Promise<labTestListResponseDto[]>;
  updateResultByVisitId(visit_id: string, result: string): Promise<LabTestResponseDto>
}