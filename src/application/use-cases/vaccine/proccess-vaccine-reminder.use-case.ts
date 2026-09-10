import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';

const MAX_REMINDERS = 3;
const GRACE_PERIOD_HOURS = 24;

export interface ProcessVaccineRemindersResult {
  totalProcessed: number;
  dueRemindersSent: number;
  overdueRemindersSent: number;
  skipped: number;
  vaccines: {
    id: string;
    name: string;
    status: 'DUE' | 'OVERDUE' | 'SKIPPED';
    reminderCount: number;
  }[];
}

export class ProcessVaccineRemindersUseCase {
  constructor(
    private repository: VaccineRepository,
    private vaccinePublisher: ReturnType<typeof createVaccinePublisher>,
  ) {}

  // ✅ userId es opcional - solo para notificaciones
  async execute(petId: string, userId?: string): Promise<ProcessVaccineRemindersResult> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    console.log(`🔍 Procesando recordatorios para mascota: ${petId}`);
    
    if (userId) {
      console.log(`👤 Usuario para notificaciones: ${userId}`);
    } else {
      console.log(`⚠️ Sin userId - no se enviarán notificaciones (solo simulación)`);
    }

    // ✅ Obtener vacunas de la mascota (sin userId en la tabla)
    const pendingVaccines = await this.repository.getPendingVaccinesByPet(petId);
    
    console.log(`📊 Encontradas ${pendingVaccines.length} vacunas pendientes`);

    const result: ProcessVaccineRemindersResult = {
      totalProcessed: pendingVaccines.length,
      dueRemindersSent: 0,
      overdueRemindersSent: 0,
      skipped: 0,
      vaccines: [],
    };

    for (const vaccine of pendingVaccines) {
      if (vaccine.reminderCount >= MAX_REMINDERS) {
        console.log(`⏭️ Vacuna ${vaccine.id} ya tiene ${vaccine.reminderCount} recordatorios (máximo)`);
        result.skipped++;
        result.vaccines.push({
          id: vaccine.id,
          name: vaccine.nameValue,
          status: 'SKIPPED',
          reminderCount: vaccine.reminderCount,
        });
        continue;
      }

      const nextDoseDate = vaccine.nextDoseDateValue;
      
      if (!nextDoseDate) {
        console.log(`⏭️ Vacuna ${vaccine.id} no tiene próxima dosis definida`);
        result.skipped++;
        result.vaccines.push({
          id: vaccine.id,
          name: vaccine.nameValue,
          status: 'SKIPPED',
          reminderCount: vaccine.reminderCount,
        });
        continue;
      }

      const dueDate = new Date(nextDoseDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📊 Vacuna ${vaccine.id} (${vaccine.nameValue}): diffDays=${diffDays}, dueDate=${dueDate.toISOString().split('T')[0]}`);
      
      if (diffDays === 0) {
        // ✅ Solo enviar notificación si hay userId
        if (userId) {
          await this.sendVaccineDueReminder(vaccine, userId);
        } else {
          console.log(`ℹ️ Simulación: Recordatorio DUE para vacuna ${vaccine.id} (sin userId)`);
        }
        result.dueRemindersSent++;
        result.vaccines.push({
          id: vaccine.id,
          name: vaccine.nameValue,
          status: 'DUE',
          reminderCount: vaccine.reminderCount + 1,
        });
        continue;
      }

      if (diffDays >= 1) {
        const hoursOverdue = diffDays * 24 + now.getHours();
        if (hoursOverdue >= GRACE_PERIOD_HOURS) {
          // ✅ Solo enviar notificación si hay userId
          if (userId) {
            await this.sendVaccineOverdueReminder(vaccine, userId);
          } else {
            console.log(`ℹ️ Simulación: Recordatorio OVERDUE para vacuna ${vaccine.id} (sin userId)`);
          }
          result.overdueRemindersSent++;
          result.vaccines.push({
            id: vaccine.id,
            name: vaccine.nameValue,
            status: 'OVERDUE',
            reminderCount: vaccine.reminderCount + 1,
          });
          continue;
        } else {
          console.log(`⏳ Vacuna ${vaccine.id} está en periodo de gracia (${hoursOverdue}h de 24h)`);
          result.skipped++;
          result.vaccines.push({
            id: vaccine.id,
            name: vaccine.nameValue,
            status: 'SKIPPED',
            reminderCount: vaccine.reminderCount,
          });
        }
      }
    }
    
    console.log('✅ Procesamiento de recordatorios completado');
    console.log(`📊 Resumen: DUE=${result.dueRemindersSent}, OVERDUE=${result.overdueRemindersSent}, SKIPPED=${result.skipped}`);
    
    return result;
  }

  private async sendVaccineDueReminder(vaccine: Vaccine, userId: string): Promise<void> {
    console.log(`📤 Enviando recordatorio DUE para vacuna ${vaccine.id} (usuario: ${userId})`);
    
    const nextDoseDate = vaccine.nextDoseDateValue;
    
    if (!nextDoseDate) {
      console.log(`⏭️ Vacuna ${vaccine.id} no tiene próxima dosis, no se envía recordatorio`);
      return;
    }
    
    await this.vaccinePublisher.publishVaccineDueReminder({
      petId: vaccine.petId,
      userId: userId,  // ✅ userId solo para notificación
      vaccineName: vaccine.nameValue,
      dueDate: nextDoseDate.toISOString(),
      reminderSentAt: new Date().toISOString(),
      reminderType: 'DUE',
    });

    await this.repository.incrementReminderCount(vaccine.id);
    await this.repository.updateLastReminderSent(vaccine.id, new Date());
    
    console.log(`✅ Recordatorio DUE enviado para vacuna ${vaccine.id}`);
  }

  private async sendVaccineOverdueReminder(vaccine: Vaccine, userId: string): Promise<void> {
    console.log(`📤 Enviando recordatorio OVERDUE para vacuna ${vaccine.id} (usuario: ${userId})`);
    
    const nextDoseDate = vaccine.nextDoseDateValue;
    
    if (!nextDoseDate) {
      console.log(`⏭️ Vacuna ${vaccine.id} no tiene próxima dosis, no se envía recordatorio`);
      return;
    }
    
    await this.vaccinePublisher.publishVaccineDueReminder({
      petId: vaccine.petId,
      userId: userId,  // ✅ userId solo para notificación
      vaccineName: vaccine.nameValue,
      dueDate: nextDoseDate.toISOString(),
      reminderSentAt: new Date().toISOString(),
      reminderType: 'OVERDUE',
    });

    await this.repository.markAsOverdue(vaccine.id);
    await this.repository.incrementReminderCount(vaccine.id);
    await this.repository.updateLastReminderSent(vaccine.id, new Date());
    
    console.log(`✅ Recordatorio OVERDUE enviado para vacuna ${vaccine.id}`);
  }
}