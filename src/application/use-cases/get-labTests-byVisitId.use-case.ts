import { LabTestRepository } from "@/src/domain/repositories/labTest.repository";
import { labTestListResponseDto } from "../dtos/labTest.dto";

export class GetLabTestsByVisitIdUseCase{
    constructor(
        private readonly labTestRepository: LabTestRepository
    ){}

    async execute(visit_id: string): Promise<labTestListResponseDto[]>{
        if(!visit_id){
            throw new Error('visit_id es requerido');
        }
        return await this,this.labTestRepository.findByVisistId(visit_id);
    }
}