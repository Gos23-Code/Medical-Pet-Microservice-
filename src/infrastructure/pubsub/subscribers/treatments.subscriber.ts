import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap, TreatmentCompletedData, TreatmentUpdatedData, TreatmentStartedData } from '../interfaces/pubsub.interface';

type TreatmentEvent = 
  | 'TREATMENT_STARTED'
  | 'TREATMENT_UPDATED'
  | 'TREATMENT_COMPLETED';

// 🔥 Tipo auxiliar - mapea cada evento a su handler específico
type EventHandlerMap = {
  [K in TreatmentEvent]: (data: PubSubEventMap[K]) => Promise<void>;
};

@Injectable()
export class TreatmentsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(TreatmentsSubscriber.name);

  // ✅ Cada handler recibe el tipo específico
  private readonly eventHandlers: EventHandlerMap = {
    'TREATMENT_STARTED': this.handleTreatmentStarted.bind(this),
    'TREATMENT_UPDATED': this.handleTreatmentUpdated.bind(this),
    'TREATMENT_COMPLETED': this.handleTreatmentCompleted.bind(this),
  };

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.TREATMENTS,
      this.handleTreatmentsEvent.bind(this)
    );
    this.logger.log('✅ TreatmentsSubscriber initialized');
  }

    private async handleTreatmentsEvent(
  message: PubSubMessage<TreatmentEvent>
): Promise<void> {
  this.logger.log(`📨 Received treatment event: ${message.event}`);

  try {
    switch (message.event) {
      case 'TREATMENT_STARTED': {
        const handler = this.eventHandlers['TREATMENT_STARTED'];
        await handler(message.data as TreatmentStartedData);
        break;
      }
      case 'TREATMENT_UPDATED': {
        const handler = this.eventHandlers['TREATMENT_UPDATED'];
        await handler(message.data as TreatmentUpdatedData);
        break;
      }
      case 'TREATMENT_COMPLETED': {
        const handler = this.eventHandlers['TREATMENT_COMPLETED'];
        await handler(message.data as TreatmentCompletedData);
        break;
      }
      default: {
        this.logger.warn(`⚠️ Unknown event: ${message.event}`);
      }
    }
  } catch (error) {
    this.logger.error(`❌ Error handling event ${message.event}:`, error);
    throw error;
  }
}

  // ============================================
  // 🔥 HANDLERS ESPECÍFICOS
  // ============================================

  private async handleTreatmentStarted(
    data: PubSubEventMap['TREATMENT_STARTED']
  ): Promise<void> {
    this.logger.log(`🩺 Treatment started: ${data.treatmentId}`);
    this.logger.debug(`Pet: ${data.petId}, Type: ${data.type}, Protocol: ${data.protocol}`);
    // TODO: Iniciar protocolo, notificar equipo, etc.
  }

  private async handleTreatmentUpdated(
    data: PubSubEventMap['TREATMENT_UPDATED']
  ): Promise<void> {
    this.logger.log(
      `📝 Treatment updated: ${data.treatmentId} → ${data.progress}%`
    );
    this.logger.debug(`Status: ${data.status}`);
    // TODO: Actualizar progreso, notificar cambios, etc.
  }

  private async handleTreatmentCompleted(
    data: PubSubEventMap['TREATMENT_COMPLETED']
  ): Promise<void> {
    this.logger.log(`✅ Treatment completed: ${data.treatmentId}`);
    this.logger.debug(`Outcome: ${data.outcome}`);
    // TODO: Finalizar tratamiento, generar reporte, etc.
  }
}