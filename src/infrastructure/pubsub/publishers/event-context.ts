import { EventRecipient } from '../interfaces/pubsub.interface';

// MED-06: contexto de clínica y destinatario que todo evento de historia puede llevar.
// `userId` = dueño de la mascota (lo resuelve Pets, no el body). Si el dueño no tiene cuenta,
// `userId` es null y `recipient` lleva el contacto (CONTRATOS_COMPARTIDOS.md §4.1).

export interface EventContext {
  recipient?: EventRecipient | null;
  veterinaryId?: string | null;
  veterinaryName?: string | null;
}

/** Campos que van dentro del payload para que la notificación diga "Clínica X aplicó…". */
export function eventContextPayload(data: EventContext): {
  veterinaryId: string | null;
  veterinaryName: string | null;
} {
  return {
    veterinaryId: data.veterinaryId ?? null,
    veterinaryName: data.veterinaryName ?? null,
  };
}

/** Metadata del sobre: el veterinaryId también viaja aquí (contrato §4.1). */
export function eventMetadata(data: EventContext): {
  version: string;
  source: string;
  veterinaryId: string | null;
} {
  return {
    version: '1.0',
    source: 'medical-pet-backend',
    veterinaryId: data.veterinaryId ?? null,
  };
}
