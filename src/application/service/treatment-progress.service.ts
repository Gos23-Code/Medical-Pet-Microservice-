export interface TreatmentProgress {
  progress: number;          // 0-100
  status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | 'COMPLETED';
  isActive: boolean;
  daysRemaining: number | null;
  totalDays: number | null;
  elapsedDays: number;
  startDate: string;
  endDate: string | null;
}

export class TreatmentProgressService {
  
  /**
   * Calcula el progreso automático basado en fechas
   */
  calculateProgress(startDate: Date, endDate: Date | null): TreatmentProgress {
    const now = new Date();
    const start = new Date(startDate);
    const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Caso 1: Sin fecha de fin (indefinido)
    if (!endDate) {
      return {
        progress: 50,
        status: 'ACTIVE_INDEFINITE',
        isActive: true,
        daysRemaining: null,
        totalDays: null,
        elapsedDays: elapsedDays,
        startDate: startDate.toISOString(),
        endDate: null,
      };
    }
    
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Caso 2: Tratamiento expirado
    if (now > end) {
      return {
        progress: 100,
        status: 'EXPIRED',
        isActive: false,
        daysRemaining: 0,
        totalDays: totalDays,
        elapsedDays: totalDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }
    
    // Caso 3: Último día
    if (now.toDateString() === end.toDateString()) {
      return {
        progress: 100,
        status: 'ACTIVE_LAST_DAY',
        isActive: true,
        daysRemaining: 0,
        totalDays: totalDays,
        elapsedDays: totalDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }
    
    // Caso 4: Activo en progreso
    const progress = Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
    const daysRemaining = totalDays - elapsedDays;
    
    return {
      progress: progress,
      status: 'ACTIVE',
      isActive: true,
      daysRemaining: daysRemaining,
      totalDays: totalDays,
      elapsedDays: elapsedDays,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }
}