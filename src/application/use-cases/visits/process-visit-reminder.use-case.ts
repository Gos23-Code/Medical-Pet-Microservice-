import { SupabaseVisitRepository } from '@/src/infrastructure/database/repositories/supabase-visit.repository';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';

const MAX_REMINDERS = 3;
const GRACE_PERIOD_HOURS = 24;

export interface ProcessVisitRemindersResult {
  totalProcessed: number;
  dueRemindersSent: number;
  overdueRemindersSent: number;
  skipped: number;
  visits: {
    id: string;
    reason: string;
    status: 'DUE' | 'OVERDUE' | 'SKIPPED';
    reminderCount: number;
  }[];
}

export class ProcessVisitRemindersUseCase {
  constructor(
    private repository: SupabaseVisitRepository,
    private visitsPublisher: ReturnType<typeof createVisitsPublisher>,
  ) {}

  async execute(petId: string, userId?: string): Promise<ProcessVisitRemindersResult> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    console.log(`🔍 Procesando recordatorios de visitas para mascota: ${petId}`);
    
    if (userId) {
      console.log(`👤 Usuario para notificaciones: ${userId}`);
    } else {
      console.log(`⚠️ Sin userId - no se enviarán notificaciones (solo simulación)`);
    }

    // ✅ Ahora pendingVisits es VeterinaryVisit[]
    const pendingVisits = await this.repository.getPendingVisitsByPet(petId);
    
    console.log(`📊 Encontradas ${pendingVisits.length} visitas pendientes`);

    const result: ProcessVisitRemindersResult = {
      totalProcessed: pendingVisits.length,
      dueRemindersSent: 0,
      overdueRemindersSent: 0,
      skipped: 0,
      visits: [],
    };

    for (const visit of pendingVisits) {
      if (visit.reminderCount >= MAX_REMINDERS) {
        console.log(`⏭️ Visita ${visit.id} ya tiene ${visit.reminderCount} recordatorios (máximo)`);
        result.skipped++;
        result.visits.push({
          id: visit.id,
          reason: visit.reason,
          status: 'SKIPPED',
          reminderCount: visit.reminderCount,
        });
        continue;
      }

      // ✅ visit.date es Date, no string
      const scheduledDate = new Date(visit.date);
      scheduledDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📊 Visita ${visit.id} (${visit.reason}): diffDays=${diffDays}, scheduledDate=${scheduledDate.toISOString().split('T')[0]}`);
      
      if (diffDays === 0) {
        if (userId) {
          await this.sendVisitDueReminder(visit, userId);
        } else {
          console.log(`ℹ️ Simulación: Recordatorio DUE para visita ${visit.id} (sin userId)`);
        }
        result.dueRemindersSent++;
        result.visits.push({
          id: visit.id,
          reason: visit.reason,
          status: 'DUE',
          reminderCount: visit.reminderCount + 1,
        });
        continue;
      }

      if (diffDays >= 1) {
        const hoursOverdue = diffDays * 24 + now.getHours();
        if (hoursOverdue >= GRACE_PERIOD_HOURS) {
          if (userId) {
            await this.sendVisitOverdueReminder(visit, userId);
          } else {
            console.log(`ℹ️ Simulación: Recordatorio OVERDUE para visita ${visit.id} (sin userId)`);
          }
          result.overdueRemindersSent++;
          result.visits.push({
            id: visit.id,
            reason: visit.reason,
            status: 'OVERDUE',
            reminderCount: visit.reminderCount + 1,
          });
          continue;
        } else {
          console.log(`⏳ Visita ${visit.id} está en periodo de gracia (${hoursOverdue}h de 24h)`);
          result.skipped++;
          result.visits.push({
            id: visit.id,
            reason: visit.reason,
            status: 'SKIPPED',
            reminderCount: visit.reminderCount,
          });
        }
      }
    }
    
    console.log('✅ Procesamiento de recordatorios de visitas completado');
    console.log(`📊 Resumen: DUE=${result.dueRemindersSent}, OVERDUE=${result.overdueRemindersSent}, SKIPPED=${result.skipped}`);
    
    return result;
  }

  // Reemplaza los métodos sendVisitDueReminder y sendVisitOverdueReminder

private async sendVisitDueReminder(visit: VeterinaryVisit, userId: string): Promise<void> {
  console.log(`📤 Enviando recordatorio DUE para visita ${visit.id} (usuario: ${userId})`);
  
  // ✅ Usar publishVisitDueReminder
  await this.visitsPublisher.publishVisitDueReminder({
    visitId: visit.id,
    petId: visit.petId,
    userId: userId,
    scheduledDate: visit.date.toISOString(),
    reason: visit.reason,
    veterinarian: visit.veterinarian,
  });

  await this.repository.incrementReminderCount(visit.id);
  await this.repository.updateLastReminderSent(visit.id, new Date());
  
  console.log(`✅ Recordatorio DUE enviado para visita ${visit.id}`);
}

private async sendVisitOverdueReminder(visit: VeterinaryVisit, userId: string): Promise<void> {
  console.log(`📤 Enviando recordatorio OVERDUE para visita ${visit.id} (usuario: ${userId})`);
  
  // ✅ Usar publishVisitOverdueReminder
  await this.visitsPublisher.publishVisitOverdueReminder({
    visitId: visit.id,
    petId: visit.petId,
    userId: userId,
    scheduledDate: visit.date.toISOString(),
    reason: `RETRASADA: ${visit.reason}`,
    veterinarian: visit.veterinarian,
  });

  await this.repository.markAsOverdue(visit.id);
  await this.repository.incrementReminderCount(visit.id);
  await this.repository.updateLastReminderSent(visit.id, new Date());
  
  console.log(`✅ Recordatorio OVERDUE enviado para visita ${visit.id}`);
}
}