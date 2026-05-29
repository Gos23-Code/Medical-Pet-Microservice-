import { LabTest } from "@/src/domain/entities/lasbTest.entity";
import { CreateLabTestDto } from "../dtos/labTest.dto";

export class LabTestMapper{
    static toDomain(dto: CreateLabTestDto): LabTest{
        return LabTest.create({
            name: dto.name,
            result: dto.result,
            normal_range: dto.normal_range,
            date: dto.date ? new Date(dto.date): undefined,
            notes: dto.notes,
        });
    }
}