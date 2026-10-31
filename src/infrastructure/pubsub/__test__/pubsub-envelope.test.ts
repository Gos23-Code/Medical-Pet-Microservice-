import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import { PubSubService, assertHasRecipient, buildDomainEventEnvelope } from '../services/pubsub.service';
import type { DomainEventInput } from '../interfaces/pubsub.interface';

// Mock del cliente de Pub/Sub: solo nos interesa qué bytes llegan al topic
const mockPublish = jest.fn<(data: Buffer) => Promise<string>>().mockResolvedValue('msg-1');
const mockTopic = jest.fn((_name: string) => ({ publish: mockPublish }));

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn().mockImplementation(() => ({ topic: mockTopic })),
}));

// Decoradores y logger de Nest no aportan nada a estos tests (y @nestjs/common es ESM)
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Logger: class {
    log() {}
    debug() {}
    warn() {}
    error() {}
  },
}));

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

const baseEvent: DomainEventInput = {
  eventType: 'WEIGHT_RECORDED',
  userId: 'user-123',
  payload: { petId: 'pet-1', weight: 5.1 },
  occurredAt: '2026-10-15T12:00:00.000Z',
};

const publishedBody = (): Record<string, unknown> => {
  const buffer = mockPublish.mock.calls[0][0];
  return JSON.parse(buffer.toString('utf-8'));
};

describe('assertHasRecipient (contrato §4.1, regla 2)', () => {
  it('acepta userId', () => {
    expect(() => assertHasRecipient(baseEvent)).not.toThrow();
  });

  it('acepta recipient con email aunque userId sea null', () => {
    expect(() =>
      assertHasRecipient({ ...baseEvent, userId: null, recipient: { email: 'dueño@correo.com' } })
    ).not.toThrow();
  });

  it('rechaza userId vacío sin recipient', () => {
    expect(() => assertHasRecipient({ ...baseEvent, userId: '' })).toThrow(/sin destinatario/);
  });

  it('rechaza userId null con recipient sin email ni teléfono', () => {
    expect(() =>
      assertHasRecipient({ ...baseEvent, userId: null, recipient: { name: 'Carlos' } })
    ).toThrow(/sin destinatario/);
  });
});

describe('buildDomainEventEnvelope (contrato §4.1)', () => {
  it('incluye recipient, occurredAt y metadata con correlationId y veterinaryId', () => {
    const envelope = buildDomainEventEnvelope(baseEvent, { version: '1.0', source: 'x' });

    expect(envelope.eventType).toBe('WEIGHT_RECORDED');
    expect(envelope.userId).toBe('user-123');
    expect(envelope.recipient).toBeNull();
    expect(envelope.occurredAt).toBe('2026-10-15T12:00:00.000Z');
    expect(envelope.metadata.version).toBe('1.0');
    expect(envelope.metadata.source).toBe('x');
    expect(envelope.metadata.veterinaryId).toBeNull();
    expect(typeof envelope.metadata.correlationId).toBe('string');
  });

  it('cada evento recibe un correlationId distinto', () => {
    const a = buildDomainEventEnvelope(baseEvent);
    const b = buildDomainEventEnvelope(baseEvent);
    expect(a.metadata.correlationId).not.toBe(b.metadata.correlationId);
  });

  it('permite pasar veterinaryId en metadata', () => {
    const envelope = buildDomainEventEnvelope(baseEvent, { veterinaryId: 'vet-9' });
    expect(envelope.metadata.veterinaryId).toBe('vet-9');
  });
});

describe('PubSubService.publishDomainEvent', () => {
  let service: PubSubService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPublish.mockResolvedValue('msg-1');
    const config = { get: () => undefined } as unknown as ConfigService;
    service = new PubSubService(config);
  });

  it('publica el sobre completo cuando hay userId', async () => {
    const id = await service.publishDomainEvent('medical-pet-weight-record', baseEvent, {
      version: '1.0',
      source: 'medical-pet-backend',
    });

    expect(id).toBe('msg-1');
    expect(mockTopic).toHaveBeenCalledWith('medical-pet-weight-record');
    const body = publishedBody();
    expect(body.userId).toBe('user-123');
    expect(body.recipient).toBeNull();
    expect(body.eventType).toBe('WEIGHT_RECORDED');
    expect((body.metadata as Record<string, unknown>).correlationId).toEqual(expect.any(String));
  });

  it('no publica nada si no hay destinatario', async () => {
    await expect(
      service.publishDomainEvent('medical-pet-weight-record', { ...baseEvent, userId: '' })
    ).rejects.toThrow(/sin destinatario/);

    expect(mockTopic).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
