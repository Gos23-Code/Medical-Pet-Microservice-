import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { UpdateLabTestResultDto, LabTestResponseDto } from '@/src/application/dtos/lab-test.dto';

export class UpdateLabTestResultUseCase {
  constructor(
    private readonly labTestRepository: LabTestRepository
  ) {}

  async execute(labTestId: string, dto: UpdateLabTestResultDto): Promise<LabTestResponseDto> {
    if (!labTestId) {
      throw new Error('labTestId es requerido');
    }

    if (!dto.result) {
      throw new Error('result es requerido');
    }

    return await this.labTestRepository.updateResultById(labTestId, dto.result);
  }
}