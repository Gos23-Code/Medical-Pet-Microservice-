import { LabTestRepository } from "@/src/domain/repositories/lab-test.repository";
import { labTestListResponseDto } from "@/src/application/dtos/lab-test.dto";

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