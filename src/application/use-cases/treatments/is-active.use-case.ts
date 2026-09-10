import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';

export interface IsActiveResult {
  isActive: boolean;
  status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED';
  message: string;
  progress: number;
  daysRemaining: number | null;
  totalDays: number | null;
  startDate: string;
  endDate: string | null;
}

export class IsActiveUseCase {
  constructor(private repository: TreatmentRepository) {}

  async execute(id: string): Promise<IsActiveResult> {
    const treatment = await this.repository.findById(id);
    
    if (!treatment) {
      throw new Error('Tratamiento no encontrado');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(treatment.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = treatment.endDate ? new Date(treatment.endDate) : null;
    if (endDate) {
      endDate.setHours(0, 0, 0, 0);
    }
    
    let isActive = false;
    let status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' = 'ACTIVE';
    let message = '';
    let progress = 0;
    let daysRemaining: number | null = null;
    let totalDays: number | null = null;

    // Función para formatear fecha corta en español
    const formatDateShort = (date: Date): string => {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} de ${month} del ${year}`;
    };

    // ✅ Función para calcular progreso (sin usar elapsedDays)
    const calculateProgress = (start: Date, end: Date | null, today: Date): number => {
      if (!end) return 50; // Indefinido = 50%
      
      const totalDaysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      
      if (totalDaysCount <= 0) return 100;
      
      // ✅ Calcular días transcurridos directamente
      const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 3600 * 24));
      
      if (elapsedDays >= totalDaysCount) return 100;
      
      return Math.min(Math.round((elapsedDays / totalDaysCount) * 100), 100);
    };

    // Caso 1: No tiene fecha de fin (activo indefinidamente)
    if (!endDate) {
      isActive = true;
      status = 'ACTIVE_INDEFINITE';
      progress = 50;
      daysRemaining = null;
      totalDays = null;
      message = `El tratamiento "${treatment.description}" está activo sin fecha de vencimiento. Inició el ${formatDateShort(startDate)}.`;
    }
    // Caso 2: La fecha de fin es hoy o en el futuro
    else if (endDate >= today) {
      isActive = true;
      
      totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      progress = calculateProgress(startDate, endDate, today);
      daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (daysRemaining === 0) {
        status = 'ACTIVE_LAST_DAY';
        message = `El tratamiento "${treatment.description}" vence HOY (${formatDateShort(endDate)}). Es el último día. Progreso: ${progress}%.`;
      } else {
        status = 'ACTIVE';
        const daysText = daysRemaining === 1 ? 'día' : 'días';
        message = `El tratamiento "${treatment.description}" está activo. Quedan ${daysRemaining} ${daysText} para que venza el ${formatDateShort(endDate)}. Progreso: ${progress}%.`;
      }
    }
    // Caso 3: La fecha de fin ya pasó
    else {
      isActive = false;
      status = 'EXPIRED';
      progress = 100;
      daysRemaining = 0;
      totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      
      const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 3600 * 24));
      const daysText = daysOverdue === 1 ? 'día' : 'días';
      message = `El tratamiento "${treatment.description}" expiró hace ${daysOverdue} ${daysText} (el ${formatDateShort(endDate)}). Progreso: 100%.`;
    }

    return {
      isActive,
      status,
      message,
      progress,
      daysRemaining,
      totalDays,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
    };
  }
}