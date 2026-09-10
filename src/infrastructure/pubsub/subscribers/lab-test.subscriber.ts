import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type LabTestEvent = 
  | 'LAB_TEST_CREATED'
  | 'LAB_TEST_UPDATED'
  | 'LAB_TEST_RESULT_UPDATED'
  | 'LAB_TEST_IS_NORMAL_CHECKED';

// 🔥 Tipo auxiliar para mapear evento -> tipo de dato específico
type EventHandlerMap = {
  [K in LabTestEvent]: (data: PubSubEventMap[K]) => Promise<void>;
};

// 🔥 Type Guard para verificar que el handler existe y es del tipo correcto
function isEventHandler<K extends LabTestEvent>(
  handler: unknown
): handler is (data: PubSubEventMap[K]) => Promise<void> {
  return typeof handler === 'function';
}

@Injectable()
export class LabTestSubscriber implements OnModuleInit {
  private readonly logger = new Logger(LabTestSubscriber.name);

  // ✅ Cada handler tiene el tipo correcto
  private readonly eventHandlers: EventHandlerMap = {
    'LAB_TEST_CREATED': this.handleLabTestCreated.bind(this),
    'LAB_TEST_UPDATED': this.handleLabTestUpdated.bind(this),
    'LAB_TEST_RESULT_UPDATED': this.handleLabTestResultUpdated.bind(this),
    'LAB_TEST_IS_NORMAL_CHECKED': this.handleLabTestIsNormalChecked.bind(this),
  };

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.LAB_TEST,
      this.handleLabTestEvent.bind(this)
    );
    this.logger.log('✅ LabTestSubscriber initialized');
  }

  private async handleLabTestEvent(
    message: PubSubMessage<LabTestEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received lab test event: ${message.event}`);

    try {
      const handler = this.eventHandlers[message.event];
      
      // ✅ Verificamos que el handler existe y es una función
      if (isEventHandler<LabTestEvent>(handler)) {
        // ✅ TypeScript ahora sabe que handler es una función que recibe el tipo correcto
        await handler(message.data);
      } else {
        this.logger.warn(`⚠️ No handler found for event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling event ${message.event}:`, error);
      throw error;
    }
  }

  // ============================================
  // 🔥 HANDLERS ESPECÍFICOS
  // ============================================
  private async handleLabTestCreated(data: PubSubEventMap['LAB_TEST_CREATED']): Promise<void> {
    this.logger.log(`🔬 New lab test created: ${data.labTestId}`);
    this.logger.debug(`Pet: ${data.petId}, Type: ${data.testType}`);
    // TODO: Guardar en BD, notificar, etc.
  }

  private async handleLabTestUpdated(data: PubSubEventMap['LAB_TEST_UPDATED']): Promise<void> {
    this.logger.log(`📝 Lab test updated: ${data.labTestId}`);
    this.logger.debug(`Updates: ${JSON.stringify(data.updates)}`);
    // TODO: Actualizar en BD
  }

  private async handleLabTestResultUpdated(data: PubSubEventMap['LAB_TEST_RESULT_UPDATED']): Promise<void> {
    this.logger.log(
      `🔬 Result updated: ${data.labTestId} → ${data.isNormal ? 'NORMAL' : 'ABNORMAL'}`
    );
    this.logger.debug(`Result: ${data.result}`);
    
    if (!data.isNormal) {
      this.logger.warn(`⚠️ Abnormal result for lab test: ${data.labTestId}`);
      // TODO: Enviar alerta
    }
  }

  private async handleLabTestIsNormalChecked(data: PubSubEventMap['LAB_TEST_IS_NORMAL_CHECKED']): Promise<void> {
    this.logger.log(
      `✅ Normal check: ${data.labTestId} → ${data.isNormal}`
    );
    this.logger.debug(`Name: ${data.name}, Result: ${data.result}`);
    // TODO: Registrar en historial
  }
}