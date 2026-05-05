import { weightRecordMapper } from "../mappers/weightRecord.mapper";
import { CreateWeightRecordDto } from "../dtos/weightRecord.dto";
import { weightRecordRepository } from "@/src/domain/repositories/weightRecord.repository";

type ApiMessageResponse = {
  message: string;
};

export class AddWeightRecordUseCase {
  constructor(private repository: weightRecordRepository) {}

  async execute(dto: CreateWeightRecordDto): Promise<ApiMessageResponse> {
    const entity = weightRecordMapper.toDomain(dto);

    await this.repository.save(entity);

    return {
      message: "WeightRecord creado correctamente",
    };
  }
}