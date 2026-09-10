import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type WeightRecordEvent = 
  | 'WEIGHT_RECORDED'
  | 'WEIGHT_ALERT';

@Injectable()
export class WeightRecordSubscriber implements OnModuleInit {
  private readonly logger = new Logger(WeightRecordSubscriber.name);

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.WEIGHT_RECORD,
      this.handleWeightRecordEvent.bind(this)
    );
    this.logger.log('✅ WeightRecordSubscriber initialized');
  }

  private async handleWeightRecordEvent(
    message: PubSubMessage<WeightRecordEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received weight record event: ${message.event}`);

    try {
      switch (message.event) {
        case 'WEIGHT_RECORDED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['WEIGHT_RECORDED'];
          await this.handleWeightRecorded(data);
          break;
        }
        case 'WEIGHT_ALERT': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['WEIGHT_ALERT'];
          await this.handleWeightAlert(data);
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
  private async handleWeightRecorded(
    data: PubSubEventMap['WEIGHT_RECORDED']
  ): Promise<void> {
    this.logger.log(
      `⚖️ Weight recorded: ${data.weightId} → ${data.weight}${data.unit}`
    );
    this.logger.debug(`Pet: ${data.petId}`);
    // TODO: Guardar en BD
  }

  private async handleWeightAlert(
    data: PubSubEventMap['WEIGHT_ALERT']
  ): Promise<void> {
    this.logger.log(
      `⚠️ Weight alert: ${data.alertType} → ${data.percentageChange}%`
    );
    this.logger.debug(`Pet: ${data.petId}`);
    // TODO: Enviar notificación
  }
}