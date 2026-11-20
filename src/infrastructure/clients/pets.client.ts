import { ServiceUnavailableError } from '@/src/infrastructure/http/api-error';
import { TtlCache } from './ttl-cache';
import { internalGet, requireServiceUrl } from './internal-http';

// PETS-04 (CONTRATOS / MEDICAL_SERVICE_CHANGES): Medical no lee la BD de Pets, pregunta por HTTP.

export interface PetOwnerContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface PetSummary {
  id: string;
  /** Null cuando la mascota la registró una clínica y el dueño aún no reclama (PETS-05). */
  ownerId: string | null;
  name: string;
  claimStatus: 'NONE' | 'UNCLAIMED' | 'CLAIMED';
  /** Contacto del dueño sin cuenta (solo viene si claimStatus = UNCLAIMED). */
  ownerContact: PetOwnerContact | null;
  /** Fecha de nacimiento YYYY-MM-DD, si Pets la envía en /internal/pets/batch. Opcional: Medical funciona sin ella. */
  birthDate?: string | null;
}

const ownerCache = new TtlCache<boolean>();
const petCache = new TtlCache<PetSummary | null>();

/** GET /internal/pets/{petId}/owner/{userId} → { isOwner }. */
export async function isPetOwner(petId: string, userId: string): Promise<boolean> {
  const key = `${petId}|${userId}`;
  const cached = ownerCache.get(key);
  if (cached !== undefined) return cached;

  const baseUrl = requireServiceUrl('PETS_SERVICE_URL');
  const result = await internalGet<{ isOwner: boolean }>(
    `${baseUrl}/internal/pets/${encodeURIComponent(petId)}/owner/${encodeURIComponent(userId)}`
  );
  ownerCache.set(key, result.isOwner === true);
  return result.isOwner === true;
}

const editorCache = new TtlCache<boolean>();

/**
 * GET /internal/pets/{petId}/access/{userId} → { hasAccess }.
 * Editor = persona a la que el dueño compartió la mascota con permiso de editor.
 * Pendiente de confirmar en Pets (ver PETS_REQUERIMIENTOS_DESDE_MEDICAL.md).
 */
export async function isPetEditor(petId: string, userId: string): Promise<boolean> {
  const key = `${petId}|${userId}`;
  const cached = editorCache.get(key);
  if (cached !== undefined) return cached;

  const baseUrl = requireServiceUrl('PETS_SERVICE_URL');
  const url = `${baseUrl}/internal/pets/${encodeURIComponent(petId)}/access/${encodeURIComponent(userId)}`;

  // Mientras Pets no publique esta ruta, responde 404: se trata como "no es editor" (deniega, nunca abre).
  const apiKey = process.env.INTERNAL_API_KEY ?? '';
  const response = await fetch(url, {
    headers: { 'X-Internal-Api-Key': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(3_000),
    cache: 'no-store',
  }).catch(() => null);

  if (response?.status === 404) {
    editorCache.set(key, false);
    return false;
  }
  if (!response || !response.ok) {
    throw new ServiceUnavailableError('Servicio interno respondió con error al consultar editores');
  }

  const result = (await response.json()) as { hasAccess: boolean };
  editorCache.set(key, result.hasAccess === true);
  return result.hasAccess === true;
}

/** POST /internal/pets/batch { ids } → datos de mascota (nombre, dueño, claimStatus). */
export async function getPets(petIds: string[]): Promise<Map<string, PetSummary>> {
  const found = new Map<string, PetSummary>();
  const missing: string[] = [];

  for (const id of petIds) {
    const cached = petCache.get(id);
    if (cached === undefined) {
      missing.push(id);
    } else if (cached) {
      found.set(id, cached);
    }
  }

  if (missing.length > 0) {
    const baseUrl = requireServiceUrl('PETS_SERVICE_URL');
    const apiKey = process.env.INTERNAL_API_KEY ?? '';
    const response = await fetch(`${baseUrl}/internal/pets/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': apiKey,
      },
      body: JSON.stringify({ ids: missing }),
      signal: AbortSignal.timeout(3_000),
      cache: 'no-store',
    }).catch(() => null);

    if (!response || !response.ok) {
      throw new ServiceUnavailableError();
    }

    const pets = (await response.json()) as PetSummary[];
    for (const id of missing) {
      const pet = pets.find((p) => p.id === id) ?? null;
      petCache.set(id, pet);
      if (pet) found.set(id, pet);
    }
  }

  return found;
}

/** Limpia cachés; lo usan las pruebas. */
export function clearPetsCache(): void {
  ownerCache.clear();
  editorCache.clear();
  petCache.clear();
}
