import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from '@google-cloud/pubsub';
import { randomUUID } from 'crypto';
import {
  PubSubMessage,
  PubSubEvent,
  PubSubEventMap,
  PubSubMetadata,
  DomainEventInput,
  DomainEventMetadata,
  DomainEventEnvelope,
} from '../interfaces/pubsub.interface';

/**
 * Contrato §4.1, regla 2: sin userId ni contacto no hay a quién notificar.
 * Se lanza antes de tocar el topic; el route handler lo captura y solo loguea.
 */
export function assertHasRecipient(event: DomainEventInput): void {
  const hasUser = typeof event.userId === 'string' && event.userId.trim() !== '';
  const hasContact = Boolean(event.recipient?.email || event.recipient?.phone);
  if (!hasUser && !hasContact) {
    throw new Error(`Evento ${event.eventType} sin destinatario (userId ni recipient): no se publica`);
  }
}

/** Construye el sobre de §4.1 con metadata por defecto (correlationId y veterinaryId). */
export function buildDomainEventEnvelope(
  event: DomainEventInput,
  metadata?: DomainEventMetadata
): DomainEventEnvelope {
  return {
    eventType: event.eventType,
    userId: event.userId ?? null,
    recipient: event.recipient ?? null,
    payload: event.payload,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    metadata: {
      version: '1.0',
      source: 'medical-pet-backend',
      veterinaryId: null,
      correlationId: randomUUID(),
      ...metadata,
    },
  };
}

@Injectable()
export class PubSubService implements OnModuleInit {
  private readonly logger = new Logger(PubSubService.name);
  private pubSubClient: PubSub;
  private subscribers: Map<
    string,
    (message: PubSubMessage<PubSubEvent>) => Promise<void>
  > = new Map();

  constructor(private configService: ConfigService) {
    this.pubSubClient = this.createPubSubClient();
  }

  private createPubSubClient(): PubSub {
    // ✅ Intentar obtener projectId de variables de entorno
    let projectId = this.configService.get<string>('GCP_PROJECT_ID');
    
    // ✅ Si no está en GCP_PROJECT_ID, intentar con GOOGLE_CLOUD_PROJECT
    if (!projectId) {
      projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');
    }

    // ✅ Si aún no hay projectId, usar el de gcloud config
    if (!projectId) {
      this.logger.warn('⚠️ No se encontró projectId en variables de entorno, usando el de gcloud CLI');
      // Si no hay projectId, PubSub lo tomará de gcloud config automáticamente
    }

    try {
      // ✅ Usar autenticación por defecto (gcloud auth application-default login)
      // Esto NO necesita GCP_CLIENT_EMAIL ni GCP_PRIVATE_KEY
      const client = new PubSub({
        projectId: projectId || undefined, // Si es undefined, usa el de gcloud
        // ✅ No pasamos credentials, usamos ADC (Application Default Credentials)
      });

      this.logger.log(`✅ PubSub client initialized successfully with project: ${projectId || 'default (from gcloud)'}`);
      return client;
    } catch (error) {
      this.logger.error('Failed to initialize PubSub client:', error);
      throw error;
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('PubSubService initialized');
  }

  /**
   * Registra un subscriber para una suscripción específica
   */
  async registerSubscriber<K extends PubSubEvent>(
    subscriptionName: string,
    handler: (message: PubSubMessage<K>) => Promise<void>
  ): Promise<void> {
    if (this.subscribers.has(subscriptionName)) {
      this.logger.warn(`Subscriber already registered for ${subscriptionName}`);
      return;
    }

    this.subscribers.set(
      subscriptionName,
      handler as (message: PubSubMessage<PubSubEvent>) => Promise<void>
    );
    await this.listenToSubscription(subscriptionName, handler);
    this.logger.log(`Subscriber registered for ${subscriptionName}`);
  }

  /**
   * Publica un mensaje en un tópico (usando PubSubMessage)
   */
  async publishMessage<K extends PubSubEvent>(
    topicName: string,
    event: K,
    data: PubSubEventMap[K],
    metadata?: PubSubMetadata
  ): Promise<string> {
    try {
      const topic = this.pubSubClient.topic(topicName);
      const message: PubSubMessage<K> = {
        event,
        data,
        timestamp: new Date().toISOString(),
        metadata,
      };

      const jsonString = JSON.stringify(message);
      this.logger.debug(`📤 [publishMessage] Publicando a ${topicName}: ${jsonString}`);

      const messageId = await topic.publish(Buffer.from(jsonString, 'utf-8'));
      this.logger.debug(`✅ [publishMessage] Publicado con ID: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to publish message to ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Publica un DomainEvent directamente (para el notification-microservice)
   */
  async publishDomainEvent(
    topicName: string,
    domainEvent: DomainEventInput,
    metadata?: DomainEventMetadata
  ): Promise<string> {
    assertHasRecipient(domainEvent);

    try {
      const topic = this.pubSubClient.topic(topicName);

      // Sobre común §4.1: userId, recipient, payload, occurredAt y metadata
      const message = buildDomainEventEnvelope(domainEvent, metadata);

      const jsonString = JSON.stringify(message);
      
      this.logger.log(`📤 [publishDomainEvent] Publicando a ${topicName}`);
      this.logger.debug(`📤 [publishDomainEvent] Contenido: ${jsonString}`);

      const messageId = await topic.publish(Buffer.from(jsonString, 'utf-8'));
      
      this.logger.log(`✅ [publishDomainEvent] Publicado con ID: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to publish DomainEvent to ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Escucha mensajes de una suscripción
   */
  private async listenToSubscription<K extends PubSubEvent>(
    subscriptionName: string,
    handler: (message: PubSubMessage<K>) => Promise<void>
  ): Promise<void> {
    try {
      const subscription = this.pubSubClient.subscription(subscriptionName);

      subscription.on('message', async (message): Promise<void> => {
        try {
          const rawData = message.data.toString('utf-8');
          this.logger.debug(`📥 [${subscriptionName}] Mensaje recibido: ${rawData}`);
          
          const data = JSON.parse(rawData) as PubSubMessage<K>;
          await handler(data);
          message.ack();
          this.logger.debug(
            `✅ [${subscriptionName}] Mensaje procesado correctamente`
          );
        } catch (error) {
          this.logger.error(
            `❌ [${subscriptionName}] Error procesando mensaje:`,
            error
          );
          message.nack();
        }
      });

      subscription.on('error', (error): void => {
        this.logger.error(`❌ [${subscriptionName}] Error en suscripción:`, error);
      });

      this.logger.log(`👂 [${subscriptionName}] Escuchando...`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to listen to subscription ${subscriptionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Crea una suscripción si no existe
   */
  async createSubscriptionIfNotExists(
    topicName: string,
    subscriptionName: string
  ): Promise<void> {
    try {
      const topic = this.pubSubClient.topic(topicName);
      const [exists] = await topic.exists();

      if (!exists) {
        await topic.create();
        this.logger.log(`✅ Topic ${topicName} created`);
      }

      const subscription = this.pubSubClient.subscription(subscriptionName);
      const [subExists] = await subscription.exists();

      if (!subExists) {
        await topic.createSubscription(subscriptionName, {
          expirationPolicy: {},
          messageRetentionDuration: { seconds: 600 },
        });
        this.logger.log(`✅ Subscription ${subscriptionName} created`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to create subscription ${subscriptionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene todos los tópicos (para debugging)
   */
  async getTopics(): Promise<string[]> {
    try {
      const [topics] = await this.pubSubClient.getTopics();
      return topics.map((topic) => topic.name);
    } catch (error) {
      this.logger.error('Failed to get topics:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las suscripciones (para debugging)
   */
  async getSubscriptions(): Promise<string[]> {
    try {
      const [subscriptions] = await this.pubSubClient.getSubscriptions();
      return subscriptions.map((sub) => sub.name);
    } catch (error) {
      this.logger.error('Failed to get subscriptions:', error);
      return [];
    }
  }
}