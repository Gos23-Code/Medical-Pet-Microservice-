import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type SurgeryEvent = 
  | 'SURGERY_SCHEDULED'
  | 'SURGERY_COMPLETED';

@Injectable()
export class SurgerySubscriber implements OnModuleInit {
  private readonly logger = new Logger(SurgerySubscriber.name);

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.SURGERY,
      this.handleSurgeryEvent.bind(this)
    );
    this.logger.log('✅ SurgerySubscriber initialized');
  }

  private async handleSurgeryEvent(
    message: PubSubMessage<SurgeryEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received surgery event: ${message.event}`);

    try {
      switch (message.event) {
        case 'SURGERY_SCHEDULED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['SURGERY_SCHEDULED'];
          await this.handleSurgeryScheduled(data);
          break;
        }
        case 'SURGERY_COMPLETED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['SURGERY_COMPLETED'];
          await this.handleSurgeryCompleted(data);
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
  private async handleSurgeryScheduled(
    data: PubSubEventMap['SURGERY_SCHEDULED']
  ): Promise<void> {
    this.logger.log(`🔪 Surgery scheduled: ${data.surgeryId}`);
    this.logger.debug(`Pet: ${data.petId}, Type: ${data.type}`);
    this.logger.debug(`Veterinarian: ${data.veterinarian}, Date: ${data.scheduledDate}`);
    // TODO: Reservar quirófano, notificar equipo, etc.
  }

  private async handleSurgeryCompleted(
    data: PubSubEventMap['SURGERY_COMPLETED']
  ): Promise<void> {
    this.logger.log(`✅ Surgery completed: ${data.surgeryId}`);
    this.logger.debug(`Outcome: ${data.outcome}`);
    this.logger.debug(`Notes: ${data.notes}`);
    // TODO: Actualizar historial, notificar dueño, etc.
  }
}