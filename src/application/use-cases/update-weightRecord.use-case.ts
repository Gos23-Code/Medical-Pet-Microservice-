import { weightRecordRepository } from "@/src/domain/repositories/weightRecord.repository";
import { UpdateWeightRecordDto, weightRecordResponseDto } from '../dtos/weightRecord.dto';

export class UpdateWeightRecordUseCase{
    constructor(
        private readonly weightRecordRepository: weightRecordRepository
    ){}

    async execute(petId: string, dto: UpdateWeightRecordDto): Promise<weightRecordResponseDto> {
        if (dto.weight <=0){
            throw new Error('El peso debe ser mayor a 0');
        }
        return await this.weightRecordRepository.updateWeightByPetId(petId, dto.weight);
        
      }
}