import { weightRecord } from "@/src/domain/entities/weightRecord.entity";
import { CreateWeightRecordDto } from "../dtos/weightRecord.dto";

export class weightRecordMapper {
  static toDomain(dto: CreateWeightRecordDto): weightRecord {
    return weightRecord.create({
      weight: dto.weight,
      date: dto.date ? new Date(dto.date) : undefined,
      note: dto.note,
    });
  }
}