import { getPets } from '@/src/infrastructure/clients/pets.client';
import { isIsoDate } from '@/src/application/clinical/pet-health/date-utils';

// Fecha de nacimiento de la mascota, desde Pets (/internal/pets/batch → birthDate).
// Es un dato de apoyo (propuesta de desparasitación y validación de esterilización), así que si Pets
// no responde o no lo envía, devuelve null y la operación sigue con el comportamiento por defecto.

export async function petBirthDate(petId: string): Promise<string | null> {
  try {
    const pet = (await getPets([petId])).get(petId);
    const raw = pet?.birthDate;
    if (typeof raw !== 'string') return null;
    const day = raw.slice(0, 10);
    return isIsoDate(day) ? day : null;
  } catch (error) {
    console.warn('⚠️ No se pudo leer la fecha de nacimiento en Pets; se usa el valor por defecto:', error);
    return null;
  }
}
