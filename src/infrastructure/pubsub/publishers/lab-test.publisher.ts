import { Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_TOPICS } from '../constants/pubsub.constants';
import {
  LabTestCreatedData,
  LabTestUpdatedData,
  LabTestResultUpdatedData,
  LabTestIsNormalCheckedData,
  PublishResponse,
} from '../interfaces/pubsub.interface';

@Injectable()
export class LabTestPublisher {
  private readonly logger = new Logger(LabTestPublisher.name);

  constructor(private pubSubService: PubSubService) {}

  async publishLabTestCreated(data: LabTestCreatedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'LAB_TEST_CREATED',
      userId: data.userId,
      payload: {
        labTestId: data.labTestId,
        petId: data.petId,
        userId: data.userId,
        testType: data.testType,
        results: data.results,
        veterinarian: data.veterinarian,
      },
      occurredAt: new Date().toISOString(),
    };

    // ✅ Usar publishDomainEvent en lugar de publishMessage
    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.LAB_TEST,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`✅ Lab test created: ${data.labTestId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'LAB_TEST_CREATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishLabTestUpdated(data: LabTestUpdatedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'LAB_TEST_UPDATED',
      userId: data.userId,
      payload: {
        labTestId: data.labTestId,
        petId: data.petId,
        userId: data.userId,
        updates: data.updates,
      },
      occurredAt: new Date().toISOString(),
    };

    // ✅ Usar publishDomainEvent
    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.LAB_TEST,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`📝 Lab test updated: ${data.labTestId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'LAB_TEST_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishLabTestResultUpdated(data: LabTestResultUpdatedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'LAB_TEST_RESULT_UPDATED',
      userId: data.userId,
      payload: {
        labTestId: data.labTestId,
        petId: data.petId,
        userId: data.userId,
        result: data.result,
        isNormal: data.isNormal,
        normalRange: data.normalRange,
      },
      occurredAt: new Date().toISOString(),
    };

    // ✅ Usar publishDomainEvent
    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.LAB_TEST,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`🔬 Lab test result updated: ${data.labTestId}`);

    return {
      success: true,
      message_id: messageId,
      event: 'LAB_TEST_RESULT_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  async publishLabTestIsNormalChecked(data: LabTestIsNormalCheckedData): Promise<PublishResponse> {
    const domainEvent = {
      eventType: 'LAB_TEST_IS_NORMAL_CHECKED',
      userId: data.userId,
      payload: {
        labTestId: data.labTestId,
        petId: data.petId,
        userId: data.userId,
        name: data.name,
        result: data.result,
        normalRange: data.normalRange,
        isNormal: data.isNormal,
      },
      occurredAt: new Date().toISOString(),
    };

    // ✅ Usar publishDomainEvent
    const messageId = await this.pubSubService.publishDomainEvent(
      PUBSUB_TOPICS.LAB_TEST,
      domainEvent,
      { version: '1.0', source: 'medical-pet-backend' }
    );

    this.logger.log(`✅ Lab test normal check: ${data.labTestId} → ${data.isNormal ? 'NORMAL' : 'ABNORMAL'}`);

    return {
      success: true,
      message_id: messageId,
      event: 'LAB_TEST_IS_NORMAL_CHECKED',
      timestamp: new Date().toISOString(),
    };
  }
}