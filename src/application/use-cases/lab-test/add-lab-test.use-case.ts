import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { CreateLabTestDto, LabTestResponseDto } from '@/src/application/dtos/lab-test.dto';
import { LabTestMapper } from '@/src/application/mappers/lab-test.mapper';

export class AddLabTestUseCase {
  constructor(
    private readonly labTestRepository: LabTestRepository
  ) {}

  async execute(dto: CreateLabTestDto): Promise<LabTestResponseDto> {
    const labTest = LabTestMapper.toDomain(dto);

    const saved = await this.labTestRepository.save(labTest);
    return saved;
  }
}