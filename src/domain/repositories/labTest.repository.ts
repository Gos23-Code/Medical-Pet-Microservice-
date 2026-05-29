import { LabTest } from '../entities/lasbTest.entity';
import { LabTestResponseDto } from '@/src/application/dtos/labTest.dto';

export interface LabTestRepository {
  save(labTest: LabTest): Promise<LabTestResponseDto>;
}