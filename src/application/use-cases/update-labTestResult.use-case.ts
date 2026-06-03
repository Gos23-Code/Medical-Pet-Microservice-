import { LabTestRepository } from '../../domain/repositories/labTest.repository';
import { UpdateLabTestResultDto, LabTestResponseDto } from '../dtos/labTest.dto';

export class UpdateLabTestResultUseCase {
  constructor(
    private readonly labTestRepository: LabTestRepository
  ) {}

  async execute(visit_id: string, dto: UpdateLabTestResultDto): Promise<LabTestResponseDto> {
    if (!visit_id) {
      throw new Error('visit_id es requerido');
    }

    if (!dto.result) {
      throw new Error('result es requerido');
    }

    return await this.labTestRepository.updateResultByVisitId(visit_id, dto.result);
  }
}