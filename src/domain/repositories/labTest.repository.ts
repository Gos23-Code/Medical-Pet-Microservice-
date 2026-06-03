import { LabTest } from '../entities/lasbTest.entity';
import { labTestListResponseDto, LabTestResponseDto } from '@/src/application/dtos/labTest.dto';

export interface LabTestRepository {
  save(labTest: LabTest): Promise<LabTestResponseDto>;
  findByVisistId(visit_id: string): Promise<labTestListResponseDto[]>;
  updateResultByVisitId(visit_id: string, result: string): Promise<LabTestResponseDto>
}