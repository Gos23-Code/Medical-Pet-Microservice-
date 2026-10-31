import { getPets } from '@/src/infrastructure/clients/pets.client';
import { getVeterinaryName } from '@/src/infrastructure/clients/veterinary.client';
import { Authorship } from '@/src/infrastructure/auth/clinical-access';
import { EventRecipient } from '@/src/infrastructure/pubsub/interfaces/pubsub.interface';

// MED-06: el destinatario de un evento de historia es el DUEÑO de la mascota, que pregunta Pets.
// Ya no sale del body: un body podría notificar a un tercero.

export interface EventTarget {
  /** Dueño con cuenta. Null si la mascota es de una clínica y el dueño aún no reclama. */
  userId: string | null;
  /** Contacto del dueño sin cuenta (contrato §4.1, regla 1). */
  recipient: EventRecipient | null;
  veterinaryId: string | null;
  veterinaryName: string | null;
}

/**
 * Resuelve a quién notificar. Devuelve null si Pets no responde o no conoce la mascota:
 * en ese caso el evento se omite y la respuesta HTTP sigue siendo exitosa (regla del repo, §7.3).
 */
export async function resolveEventTarget(
  petId: string,
  context: Pick<Authorship, 'veterinaryId'>
): Promise<EventTarget | null> {
  try {
    const pet = (await getPets([petId])).get(petId);
    if (!pet) {
      console.warn(`⚠️ Pets no conoce la mascota ${petId}: el evento no se publica`);
      return null;
    }

    const veterinaryId = context.veterinaryId;
    const veterinaryName = veterinaryId ? await getVeterinaryName(veterinaryId) : null;

    if (pet.ownerId) {
      return { userId: pet.ownerId, recipient: null, veterinaryId, veterinaryName };
    }

    const contact = pet.ownerContact;
    const hasContact = Boolean(contact?.email || contact?.phone);
    return {
      userId: null,
      recipient: hasContact && contact
        ? { email: contact.email, phone: contact.phone, name: contact.name }
        : null,
      veterinaryId,
      veterinaryName,
    };
  } catch (error) {
    console.error(`❌ No se pudo resolver el destinatario de la mascota ${petId}:`, error);
    return null;
  }
}
