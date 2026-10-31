import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import { EventRecipient } from '../interfaces/pubsub.interface';
import { EventContext, eventContextPayload, eventMetadata } from './event-context';
import { PublishResponse } from '../interfaces/pubsub.interface';

@Injectable()
export class VisitsPublisher {
  private readonly logger = new Logger(VisitsPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishVisitScheduled(data: {
    visitId: string;
    petId: string;
    userId: string | null;

    recipient?: EventRecipient | null;

    veterinaryId?: string | null;

    veterinaryName?: string | null;
    scheduledDate: string;
    reason: string;
    veterinarian: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VISIT_SCHEDULED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        visitId: data.visitId,
        petId: data.petId,
        userId: data.userId,
        scheduledDate: data.scheduledDate,
        reason: data.reason,
        veterinarian: data.veterinarian,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VISITS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`📅 Visit scheduled: ${data.visitId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VISIT_SCHEDULED',
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ NUEVO: Recordatorio DUE (visita de hoy)
  async publishVisitDueReminder(data: {
    visitId: string;
    petId: string;
    userId: string | null;

    recipient?: EventRecipient | null;

    veterinaryId?: string | null;

    veterinaryName?: string | null;
    scheduledDate: string;
    reason: string;
    veterinarian: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VISIT_DUE_REMINDER',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        visitId: data.visitId,
        petId: data.petId,
        userId: data.userId,
        scheduledDate: data.scheduledDate,
        reason: data.reason,
        veterinarian: data.veterinarian,
        reminderType: 'DUE',
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VISITS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`⏰ Visit DUE reminder: ${data.visitId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VISIT_DUE_REMINDER',
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ NUEVO: Recordatorio OVERDUE (visita retrasada)
  async publishVisitOverdueReminder(data: {
    visitId: string;
    petId: string;
    userId: string | null;

    recipient?: EventRecipient | null;

    veterinaryId?: string | null;

    veterinaryName?: string | null;
    scheduledDate: string;
    reason: string;
    veterinarian: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VISIT_OVERDUE_REMINDER',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        visitId: data.visitId,
        petId: data.petId,
        userId: data.userId,
        scheduledDate: data.scheduledDate,
        reason: data.reason,
        veterinarian: data.veterinarian,
        reminderType: 'OVERDUE',
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VISITS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`⚠️ Visit OVERDUE reminder: ${data.visitId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VISIT_OVERDUE_REMINDER',
      timestamp: new Date().toISOString(),
    };
  }

  async publishVisitCompleted(data: {
    visitId: string;
    petId: string;
    userId: string | null;

    recipient?: EventRecipient | null;

    veterinaryId?: string | null;

    veterinaryName?: string | null;
    diagnosis: string;
    prescriptions: string[];
    notes: string;
    completedAt: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'VISIT_COMPLETED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        visitId: data.visitId,
        petId: data.petId,
        userId: data.userId,
        diagnosis: data.diagnosis,
        prescriptions: data.prescriptions,
        notes: data.notes,
        completedAt: data.completedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.VISITS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`✅ Visit completed: ${data.visitId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'VISIT_COMPLETED',
      timestamp: new Date().toISOString(),
    };
  }
}