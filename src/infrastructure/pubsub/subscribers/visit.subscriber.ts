import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type VisitEvent = 
  | 'VISIT_SCHEDULED'
  | 'VISIT_COMPLETED';

@Injectable()
export class VisitsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(VisitsSubscriber.name);

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.VISITS,
      this.handleVisitsEvent.bind(this)
    );
    this.logger.log('✅ VisitsSubscriber initialized');
  }

  private async handleVisitsEvent(
    message: PubSubMessage<VisitEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received visit event: ${message.event}`);

    try {
      switch (message.event) {
        case 'VISIT_SCHEDULED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['VISIT_SCHEDULED'];
          await this.handleVisitScheduled(data);
          break;
        }
        case 'VISIT_COMPLETED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['VISIT_COMPLETED'];
          await this.handleVisitCompleted(data);
          break;
        }
        default: {
          const unknownEvent: string = message.event;
          this.logger.warn(`⚠️ Unknown event: ${unknownEvent}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error handling event ${message.event}:`, error);
      throw error;
    }
  }

  // ✅ Handlers con PubSubEventMap
  private async handleVisitScheduled(
    data: PubSubEventMap['VISIT_SCHEDULED']
  ): Promise<void> {
    this.logger.log(`📅 Visit scheduled: ${data.visitId}`);
    this.logger.debug(`Pet: ${data.petId}, Reason: ${data.reason}`);
    this.logger.debug(`Veterinarian: ${data.veterinarian}, Date: ${data.scheduledDate}`);
    // TODO: Agendar en calendario, notificar dueño, etc.
  }

  private async handleVisitCompleted(
    data: PubSubEventMap['VISIT_COMPLETED']
  ): Promise<void> {
    this.logger.log(`✅ Visit completed: ${data.visitId}`);
    this.logger.debug(`Diagnosis: ${data.diagnosis}`);
    this.logger.debug(`Prescriptions: ${data.prescriptions.join(', ')}`);
    // TODO: Generar resumen, actualizar historial, etc.
  }
}