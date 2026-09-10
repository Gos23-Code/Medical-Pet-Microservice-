import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import {
  VaccineAppliedData,
  VaccineUpdatedData,  // ✅ IMPORTAR
  VaccineDueReminderData,
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class VaccinePublisher {
  private readonly logger = new Logger(VaccinePublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishVaccineApplied(data: VaccineAppliedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VACCINE_APPLIED',
      userId: data.userId,
      payload: {
        vaccineId: data.vaccineId,
        petId: data.petId,
        userId: data.userId,
        name: data.name,
        batch: data.batch,
        applicationDate: data.applicationDate,
        nextDoseDate: data.nextDoseDate,
        veterinarian: data.veterinarian,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VACCINE,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`💉 Vaccine applied: ${data.vaccineId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VACCINE_APPLIED',
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ NUEVO: Vacuna actualizada
  async publishVaccineUpdated(data: VaccineUpdatedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VACCINE_UPDATED',
      userId: data.userId,
      payload: {
        vaccineId: data.vaccineId,
        petId: data.petId,
        userId: data.userId,
        name: data.name,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        changes: data.changes,
        updatedAt: data.updatedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VACCINE,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`📝 Vaccine updated: ${data.vaccineId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VACCINE_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishVaccineDueReminder(data: VaccineDueReminderData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: data.reminderType === 'DUE' ? 'VACCINE_DUE_REMINDER' : 'VACCINE_OVERDUE_REMINDER',
      userId: data.userId,
      payload: {
        petId: data.petId,
        userId: data.userId,
        vaccineName: data.vaccineName,
        dueDate: data.dueDate,
        reminderSentAt: data.reminderSentAt,
        reminderType: data.reminderType,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VACCINE,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`⏰ Vaccine ${data.reminderType} reminder: ${data.vaccineName}`);

    return {
      success: true,
      message_id: messageId,
      event: data.reminderType === 'DUE' ? 'VACCINE_DUE_REMINDER' : 'VACCINE_OVERDUE_REMINDER',
      timestamp: new Date().toISOString(),
    };
  }
}