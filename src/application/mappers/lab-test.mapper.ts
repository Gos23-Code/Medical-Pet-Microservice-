// src/application/mappers/lab-test.mapper.ts
import { LabTest } from "@/src/domain/entities/lab-test.entity";
import { CreateLabTestDto, LabTestResponseDto } from "@/src/application/dtos/lab-test.dto";

export class LabTestMapper {
    static toDomain(dto: CreateLabTestDto): LabTest {
        return LabTest.create({
            name: dto.name,
            result: dto.result || '',
            normal_range: dto.normal_range || '',
            date: dto.date ? new Date(dto.date) : new Date(),
            notes: dto.notes || '',
            visit_id: dto.visit_id
        });
    }

    // Este método ya no es necesario porque el repositorio devuelve DTOs directamente
    // Pero lo mantenemos por si se necesita en otros casos
    static toResponse(entity: LabTest): LabTestResponseDto {
        return {
            id: entity.id || '',
            visit_id: entity.visit_id || '',
            name: entity.name,
            result: entity.result || '',
            normal_range: entity.normal_range || '',
            date: entity.date instanceof Date 
                ? entity.date.toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0],
            notes: entity.notes || '',
            created_at: entity.created_at instanceof Date 
                ? entity.created_at.toISOString() 
                : new Date().toISOString(),
        };
    }
}