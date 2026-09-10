import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import {
  TreatmentStartedData,
  TreatmentUpdatedData,
  TreatmentCompletedData,
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class TreatmentsPublisher {
  private readonly logger = new Logger(TreatmentsPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishTreatmentStarted(data: TreatmentStartedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'TREATMENT_STARTED',
      userId: data.userId,
      payload: {
        treatmentId: data.treatmentId,
        petId: data.petId,
        userId: data.userId,
        type: data.type,
        protocol: data.protocol,
        startedAt: data.startedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.TREATMENTS,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`🩺 Treatment started: ${data.treatmentId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'TREATMENT_STARTED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishTreatmentUpdated(data: TreatmentUpdatedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'TREATMENT_UPDATED',
      userId: data.userId,
      payload: {
        treatmentId: data.treatmentId,
        petId: data.petId,
        userId: data.userId,
        progress: data.progress,
        status: data.status,
        updatedAt: data.updatedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.TREATMENTS,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`📝 Treatment updated: ${data.treatmentId} → ${data.progress}%`);

    return {
      success: true,
      message_id: messageId,
      event: 'TREATMENT_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishTreatmentCompleted(data: TreatmentCompletedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'TREATMENT_COMPLETED',
      userId: data.userId,
      payload: {
        treatmentId: data.treatmentId,
        petId: data.petId,
        userId: data.userId,
        outcome: data.outcome,
        completedAt: data.completedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.TREATMENTS,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`✅ Treatment completed: ${data.treatmentId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'TREATMENT_COMPLETED',
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // 💊 NUEVO: Publicar evento de medicamento agregado
  // ============================================
  async publishMedicationAdded(data: {
    treatmentId: string;
    treatmentName: string;
    petId: string;
    userId: string;
    medicationId: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    addedAt: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'MEDICATION_ADDED',
      userId: data.userId,
      payload: {
        treatmentId: data.treatmentId,
        treatmentName: data.treatmentName,
        petId: data.petId,
        userId: data.userId,
        medicationId: data.medicationId,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        addedAt: data.addedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.TREATMENTS,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`💊 Medication added: ${data.medicationId} - ${data.name}`);

    return {
      success: true,
      message_id: messageId,
      event: 'MEDICATION_ADDED',
      timestamp: new Date().toISOString(),
    };
  }
}