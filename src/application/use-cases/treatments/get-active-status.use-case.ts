import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';
import { TreatmentProgressService } from '@/src/application/service/treatment-progress.service';
import { IsActiveResponseDTO } from '@/src/application/dtos/treatment.dto';

export class GetActiveStatusUseCase {
  constructor(
    private repository: TreatmentRepository,
    private progressService: TreatmentProgressService,
  ) {}

  async execute(treatmentId: string): Promise<IsActiveResponseDTO> {
    const treatment = await this.repository.findById(treatmentId);
    
    if (!treatment) {
      throw new Error('Treatment not found');
    }
    
    // ✅ Calcular progreso
    const progress = this.progressService.calculateProgress(
      treatment.startDate,
      treatment.endDate
    );
    
    let message = '';
    switch (progress.status) {
      case 'ACTIVE':
        message = `Tratamiento activo - ${progress.progress}% completado`;
        break;
      case 'ACTIVE_INDEFINITE':
        message = 'Tratamiento activo (sin fecha de fin definida)';
        break;
      case 'ACTIVE_LAST_DAY':
        message = 'Último día del tratamiento';
        break;
      case 'EXPIRED':
        message = 'Tratamiento expirado';
        break;
    }
    
    return {
      treatmentId,
      isActive: progress.isActive,
      status: progress.status,
      progress: progress.progress,
      message,
      checkedAt: new Date().toISOString(),
    };
  }
}