import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import { EventContext, eventContextPayload, eventMetadata } from './event-context';
import {
  WeightRecordedData,
  WeightAlertData,
  WeightUpdatedData,  // ✅ AGREGAR import
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class WeightRecordPublisher {
  private readonly logger = new Logger(WeightRecordPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishWeightRecorded(data: WeightRecordedData & EventContext): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'WEIGHT_RECORDED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        weightId: data.weightId,
        petId: data.petId,
        userId: data.userId,
        weight: data.weight,
        unit: data.unit,
        recordedAt: data.recordedAt,
        notes: data.notes,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.WEIGHT_RECORD,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`⚖️ Weight recorded: ${data.weightId} → ${data.weight}${data.unit}`);

    return {
      success: true,
      message_id: messageId,
      event: 'WEIGHT_RECORDED',
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ NUEVO: Peso actualizado
  async publishWeightUpdated(data: WeightUpdatedData & EventContext): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'WEIGHT_UPDATED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        weightId: data.weightId,
        petId: data.petId,
        userId: data.userId,
        oldWeight: data.oldWeight,
        newWeight: data.newWeight,
        unit: data.unit,
        updatedAt: data.updatedAt,
        notes: data.notes,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.WEIGHT_RECORD,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`⚖️ Weight updated: ${data.weightId} → ${data.oldWeight} → ${data.newWeight}${data.unit}`);

    return {
      success: true,
      message_id: messageId,
      event: 'WEIGHT_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishWeightAlert(data: WeightAlertData & EventContext): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'WEIGHT_ALERT',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        petId: data.petId,
        userId: data.userId,
        currentWeight: data.currentWeight,
        previousWeight: data.previousWeight,
        percentageChange: data.percentageChange,
        alertType: data.alertType,
        alertedAt: data.alertedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.WEIGHT_RECORD,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`⚠️ Weight alert: ${data.alertType} → ${data.percentageChange}%`);

    return {
      success: true,
      message_id: messageId,
      event: 'WEIGHT_ALERT',
      timestamp: new Date().toISOString(),
    };
  }
}