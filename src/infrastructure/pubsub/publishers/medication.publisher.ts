import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import { EventRecipient } from '../interfaces/pubsub.interface';
import { EventContext, eventContextPayload, eventMetadata } from './event-context';
import {
  MedicationPrescribedData,
  MedicationAdministeredData,
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class MedicationsPublisher {
  private readonly logger = new Logger(MedicationsPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishMedicationPrescribed(data: MedicationPrescribedData & EventContext): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'MEDICATION_PRESCRIBED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        medicationId: data.medicationId,
        petId: data.petId,
        userId: data.userId,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        prescribedAt: data.prescribedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.MEDICATIONS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`💊 Medication prescribed: ${data.medicationId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'MEDICATION_PRESCRIBED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishMedicationAdministered(data: MedicationAdministeredData & EventContext): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'MEDICATION_ADMINISTERED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        medicationId: data.medicationId,
        petId: data.petId,
        userId: data.userId,
        administeredBy: data.administeredBy,
        administeredAt: data.administeredAt,
        notes: data.notes,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.MEDICATIONS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`💉 Medication administered: ${data.medicationId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'MEDICATION_ADMINISTERED',
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // 💊 NUEVO: Medicamento actualizado (dosis/frecuencia)
  // ============================================
  async publishMedicationUpdated(data: {
    medicationId: string;
    treatmentId: string;
    treatmentName: string;
    petId: string;
    userId: string | null;

    recipient?: EventRecipient | null;

    veterinaryId?: string | null;

    veterinaryName?: string | null;
    name: string;
    oldDosage: string;
    newDosage: string;
    oldFrequency: string;
    newFrequency: string;
    changeMessage: string;
    updatedAt: string;
  }): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'MEDICATION_UPDATED',
      userId: data.userId ?? null,
      recipient: data.recipient ?? null,
      payload: {
        ...eventContextPayload(data),
        medicationId: data.medicationId,
        treatmentId: data.treatmentId,
        treatmentName: data.treatmentName,
        petId: data.petId,
        userId: data.userId,
        name: data.name,
        oldDosage: data.oldDosage,
        newDosage: data.newDosage,
        oldFrequency: data.oldFrequency,
        newFrequency: data.newFrequency,
        changeMessage: data.changeMessage,
        updatedAt: data.updatedAt,
      },
      occurredAt: new Date().toISOString(),
    };

    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.MEDICATIONS,
      domainEvent,
      eventMetadata(data)
    );

    this.logger.log(`💊 Medication updated: ${data.medicationId} - ${data.changeMessage}`);

    return {
      success: true,
      message_id: messageId,
      event: 'MEDICATION_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }
}