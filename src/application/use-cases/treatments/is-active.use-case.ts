import { TreatmentRepository } from '@/src/domain/repositories/treatment.repository';

export class IsActiveUseCase {
  constructor(private repository: TreatmentRepository) {}

  async execute(id: string): Promise<{ isActive: boolean; status: string; message: string }> {
    const treatment = await this.repository.findById(id);
    
    if (!treatment) {
      throw new Error('Tratamiento no encontrado');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = treatment.startDate;
    const endDate = treatment.endDate;
    startDate.setHours(0, 0, 0, 0);
    
    let isActive = false;
    let status = '';
    let message = '';

    // Función para formatear fecha corta en español
    const formatDateShort = (date: Date): string => {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} de ${month} del ${year}`;
    };

    // Caso 1: No tiene fecha de fin (activo indefinidamente)
    if (!endDate) {
      isActive = true;
      status = 'ACTIVE_INDEFINITE';
      message = `El tratamiento "${treatment.description}" está activo sin fecha de vencimiento. Inició el ${formatDateShort(startDate)}.`;
    }
    // Caso 2: La fecha de fin es hoy o en el futuro
    else if (endDate >= today) {
      isActive = true;
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysRemaining === 0) {
        status = 'ACTIVE_LAST_DAY';
        message = `El tratamiento "${treatment.description}" vence HOY (${formatDateShort(endDate)}). Es el último día.`;
      } else {
        status = 'ACTIVE';
        const daysText = daysRemaining === 1 ? 'día' : 'días';
        message = `El tratamiento "${treatment.description}" está activo. Quedan ${daysRemaining} ${daysText} para que venza el ${formatDateShort(endDate)}.`;
      }
    }
    // Caso 3: La fecha de fin ya pasó
    else {
      isActive = false;
      const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 3600 * 24));
      const daysText = daysOverdue === 1 ? 'día' : 'días';
      status = 'EXPIRED';
      message = `El tratamiento "${treatment.description}" expiró hace ${daysOverdue} ${daysText} (el ${formatDateShort(endDate)}).`;
    }

    return { isActive, status, message };
  }
}