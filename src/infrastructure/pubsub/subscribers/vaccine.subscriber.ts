import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type VaccineEvent = 
  | 'VACCINE_APPLIED'
  | 'VACCINE_DUE_REMINDER';

@Injectable()
export class VaccineSubscriber implements OnModuleInit {
  private readonly logger = new Logger(VaccineSubscriber.name);

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.VACCINE,
      this.handleVaccineEvent.bind(this)
    );
    this.logger.log('✅ VaccineSubscriber initialized');
  }

  private async handleVaccineEvent(
    message: PubSubMessage<VaccineEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received vaccine event: ${message.event}`);

    try {
      switch (message.event) {
        case 'VACCINE_APPLIED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['VACCINE_APPLIED'];
          await this.handleVaccineApplied(data);
          break;
        }
        case 'VACCINE_DUE_REMINDER': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['VACCINE_DUE_REMINDER'];
          await this.handleVaccineDueReminder(data);
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

  // ✅ Los handlers también usan PubSubEventMap
  private async handleVaccineApplied(
    data: PubSubEventMap['VACCINE_APPLIED']
  ): Promise<void> {
    this.logger.log(`💉 Vaccine applied: ${data.vaccineId}`);
    this.logger.debug(`Pet: ${data.petId}, Name: ${data.name}, Batch: ${data.batch}`);
    // TODO: Actualizar cartilla de vacunación
  }

  private async handleVaccineDueReminder(
    data: PubSubEventMap['VACCINE_DUE_REMINDER']
  ): Promise<void> {
    this.logger.log(`⏰ Vaccine due reminder: ${data.vaccineName}`);
    this.logger.debug(`Pet: ${data.petId}, Due: ${data.dueDate}`);
    // TODO: Enviar recordatorio
  }
}