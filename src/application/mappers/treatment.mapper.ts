import { Treatment } from '@/src/domain/entities/treatment.entity';
import { TreatmentResponseDTO, MedicationFromService } from '@/src/application/dtos/treatment.dto';

export class TreatmentMapper {
  static toDTO(treatment: Treatment, medications?: MedicationFromService[]): TreatmentResponseDTO & { medications?: MedicationFromService[] } {
    // ✅ Calcular progreso
    const progress = this.calculateProgress(treatment);
    const status = this.calculateStatus(treatment);
    const isActive = treatment.isActive();
    const daysRemaining = this.calculateDaysRemaining(treatment);
    const totalDays = this.calculateTotalDays(treatment);
    const elapsedDays = this.calculateElapsedDays(treatment);

    return {
      id: treatment.id,
      visitId: treatment.visitId,
      description: treatment.description,
      startDate: treatment.startDate.toISOString().split('T')[0],
      endDate: treatment.endDate?.toISOString().split('T')[0] || null,
      notes: treatment.notes,
      isActive: isActive,
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
      // ✅ Campos de progreso
      progress: progress,
      status: status,
      daysRemaining: daysRemaining,
      totalDays: totalDays,
      elapsedDays: elapsedDays,
      medications: medications || [],
    };
  }

  static toDTOList(treatments: Treatment[]): TreatmentResponseDTO[] {
    return treatments.map(treatment => {
      const progress = this.calculateProgress(treatment);
      const status = this.calculateStatus(treatment);
      const isActive = treatment.isActive();
      const daysRemaining = this.calculateDaysRemaining(treatment);
      const totalDays = this.calculateTotalDays(treatment);
      const elapsedDays = this.calculateElapsedDays(treatment);

      return {
        id: treatment.id,
        visitId: treatment.visitId,
        description: treatment.description,
        startDate: treatment.startDate.toISOString().split('T')[0],
        endDate: treatment.endDate?.toISOString().split('T')[0] || null,
        notes: treatment.notes,
        isActive: isActive,
        createdAt: treatment.createdAt.toISOString(),
        updatedAt: treatment.updatedAt.toISOString(),
        // ✅ Campos de progreso
        progress: progress,
        status: status,
        daysRemaining: daysRemaining,
        totalDays: totalDays,
        elapsedDays: elapsedDays,
      };
    });
  }

  // ============================================
  // 🔧 FUNCIONES DE CÁLCULO
  // ============================================

  private static calculateProgress(treatment: Treatment): number {
    const now = new Date();
    const start = new Date(treatment.startDate);
    const end = treatment.endDate ? new Date(treatment.endDate) : null;

    // Si no tiene fecha de fin
    if (!end) return 50;

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return 100;

    const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (elapsedDays >= totalDays) return 100;

    return Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
  }

  private static calculateStatus(treatment: Treatment): 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | 'COMPLETED' {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(treatment.startDate);
    start.setHours(0, 0, 0, 0);
    const end = treatment.endDate ? new Date(treatment.endDate) : null;
    if (end) end.setHours(0, 0, 0, 0);

    // Sin fecha de fin
    if (!end) return 'ACTIVE_INDEFINITE';

    // Si la fecha de fin ya pasó
    if (end < now) return 'EXPIRED';

    // Si es hoy
    if (end.getTime() === now.getTime()) return 'ACTIVE_LAST_DAY';

    return 'ACTIVE';
  }

  private static calculateDaysRemaining(treatment: Treatment): number | null {
    if (!treatment.endDate) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(treatment.endDate);
    end.setHours(0, 0, 0, 0);

    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }

  private static calculateTotalDays(treatment: Treatment): number | null {
    if (!treatment.endDate) return null;

    const start = new Date(treatment.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(treatment.endDate);
    end.setHours(0, 0, 0, 0);

    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static calculateElapsedDays(treatment: Treatment): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(treatment.startDate);
    start.setHours(0, 0, 0, 0);

    const diff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }
}