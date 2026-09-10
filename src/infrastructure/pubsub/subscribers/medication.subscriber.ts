import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSubService } from '../services/pubsub.service';
import { PUBSUB_SUBSCRIPTIONS } from '../constants/pubsub.constants';
import { PubSubMessage, PubSubEventMap } from '../interfaces/pubsub.interface';

type MedicationEvent = 
  | 'MEDICATION_PRESCRIBED'
  | 'MEDICATION_ADMINISTERED';

@Injectable()
export class MedicationsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(MedicationsSubscriber.name);

  constructor(private pubSubService: PubSubService) {}

  async onModuleInit(): Promise<void> {
    await this.pubSubService.registerSubscriber(
      PUBSUB_SUBSCRIPTIONS.MEDICATIONS,
      this.handleMedicationsEvent.bind(this)
    );
    this.logger.log('✅ MedicationsSubscriber initialized');
  }

  private async handleMedicationsEvent(
    message: PubSubMessage<MedicationEvent>
  ): Promise<void> {
    this.logger.log(`📨 Received medication event: ${message.event}`);

    try {
      switch (message.event) {
        case 'MEDICATION_PRESCRIBED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['MEDICATION_PRESCRIBED'];
          await this.handleMedicationPrescribed(data);
          break;
        }
        case 'MEDICATION_ADMINISTERED': {
          // ✅ Usando PubSubEventMap
          const data = message.data as PubSubEventMap['MEDICATION_ADMINISTERED'];
          await this.handleMedicationAdministered(data);
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
  private async handleMedicationPrescribed(
    data: PubSubEventMap['MEDICATION_PRESCRIBED']
  ): Promise<void> {
    this.logger.log(`💊 Medication prescribed: ${data.medicationId}`);
    this.logger.debug(`Pet: ${data.petId}, Name: ${data.name}`);
    // TODO: Guardar en BD, notificar farmacia, etc.
  }

  private async handleMedicationAdministered(
    data: PubSubEventMap['MEDICATION_ADMINISTERED']
  ): Promise<void> {
    this.logger.log(`💉 Medication administered: ${data.medicationId}`);
    this.logger.debug(`Pet: ${data.petId}, By: ${data.administeredBy}`);
    // TODO: Registrar administración, actualizar stock, etc.
  }
}