import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import {
  SurgeryScheduledData,
  SurgeryCompletedData,
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class SurgeryPublisher {
  private readonly logger = new Logger(SurgeryPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishSurgeryScheduled(data: SurgeryScheduledData): Promise<PublishResponse> {
    // ✅ Construir DomainEvent con userId en la raíz
    const domainEvent = {
      eventType: 'SURGERY_SCHEDULED',
      userId: data.userId,
      payload: {
        surgeryId: data.surgeryId,
        petId: data.petId,
        userId: data.userId,
        type: data.type,
        scheduledDate: data.scheduledDate,
        veterinarian: data.veterinarian,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.SURGERY,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`🔪 Surgery scheduled: ${data.surgeryId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'SURGERY_SCHEDULED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishSurgeryCompleted(data: SurgeryCompletedData): Promise<PublishResponse> {
    // ✅ Construir DomainEvent con userId en la raíz
    const domainEvent = {
      eventType: 'SURGERY_COMPLETED',
      userId: data.userId,
      payload: {
        surgeryId: data.surgeryId,
        petId: data.petId,
        userId: data.userId,
        outcome: data.outcome,
        notes: data.notes,
        completedAt: data.completedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.SURGERY,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`✅ Surgery completed: ${data.surgeryId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'SURGERY_COMPLETED',
      timestamp: new Date().toISOString(),
    };
  }
}