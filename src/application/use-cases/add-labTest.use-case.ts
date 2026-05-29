import { LabTestRepository } from '../../domain/repositories/labTest.repository';
import { CreateLabTestDto, LabTestResponseDto } from '../dtos/labTest.dto';
import { LabTestMapper } from '../mappers/labTest.mapper';

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