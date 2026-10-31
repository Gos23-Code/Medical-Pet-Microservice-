import { TtlCache } from './ttl-cache';
import { internalGet, requireServiceUrl } from './internal-http';

// CONTRATOS_COMPARTIDOS.md §3: Veterinary es la única fuente de verdad de permisos sobre una mascota.

export type ClinicPermission =
  | 'CLINIC_CONFIGURE'
  | 'SUBSCRIPTION_MANAGE'
  | 'STAFF_MANAGE'
  | 'APPOINTMENT_MANAGE'
  | 'PATIENT_REGISTER'
  | 'CLINICAL_READ'
  | 'CLINICAL_READ_BASIC'
  | 'CLINICAL_WRITE'
  | 'NURSING_WRITE'
  | 'DOCUMENT_UPLOAD'
  | 'REPORTS_VIEW';

export interface PetAccessResponse {
  hasAccess: boolean;
  veterinaryStatus: string;
  employeeId: string | null;
  role: string | null;
  licensed: boolean;
  permissions: ClinicPermission[];
}

const accessCache = new TtlCache<PetAccessResponse>();
const summaryCache = new TtlCache<{ name: string } | null>();

/** GET /internal/veterinaries/{vetId}/patients/{petId}/access?userId= */
export async function getPetAccess(
  veterinaryId: string,
  petId: string,
  userId: string
): Promise<PetAccessResponse> {
  const key = `${veterinaryId}|${petId}|${userId}`;
  const cached = accessCache.get(key);
  if (cached) return cached;

  const baseUrl = requireServiceUrl('VETERINARY_SERVICE_URL');
  const access = await internalGet<PetAccessResponse>(
    `${baseUrl}/internal/veterinaries/${encodeURIComponent(veterinaryId)}` +
      `/patients/${encodeURIComponent(petId)}/access?userId=${encodeURIComponent(userId)}`
  );
  accessCache.set(key, access);
  return access;
}

/**
 * Nombre de la clínica para los eventos (MED-06). Es opcional: si Veterinary no responde
 * el evento sale igual, sin `veterinaryName`. Por eso no lanza error.
 */
export async function getVeterinaryName(veterinaryId: string): Promise<string | null> {
  const cached = summaryCache.get(veterinaryId);
  if (cached !== undefined) return cached?.name ?? null;

  try {
    const baseUrl = requireServiceUrl('VETERINARY_SERVICE_URL');
    const summary = await internalGet<{ name: string }>(
      `${baseUrl}/internal/veterinaries/${encodeURIComponent(veterinaryId)}/summary`
    );
    summaryCache.set(veterinaryId, summary);
    return summary.name;
  } catch (error) {
    console.warn('⚠️ No se pudo obtener el nombre de la clínica para el evento:', error);
    return null;
  }
}

export function clearVeterinaryCache(): void {
  accessCache.clear();
  summaryCache.clear();
}
