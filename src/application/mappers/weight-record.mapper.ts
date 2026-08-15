import { weightRecord } from "@/src/domain/entities/weight-record.entity";
import { CreateWeightRecordDto } from "@/src/application/dtos/weight-record.dto";

export class weightRecordMapper {
  static toDomain(dto: CreateWeightRecordDto): weightRecord {
    return weightRecord.create({
      petId: dto.petId,
      weight: dto.weight,
      date: dto.date ? new Date(dto.date) : undefined,
      note: dto.note,
    });
  }
}