import { ForbiddenError } from '@/src/infrastructure/http/api-error';
import { ClinicPermission, getPetAccess } from '@/src/infrastructure/clients/veterinary.client';
import { isPetOwner } from '@/src/infrastructure/clients/pets.client';
import { Actor } from './actor';

// MED-03 (MEDICAL_SERVICE_CHANGES.md): un mismo endpoint atiende a dos tipos de actor.
//   • Dueño (token USER): lee su historia (verificado con Pets) y registra peso con Source = OWNER.
//   • Clínica (token VETERINARY): permisos según Veterinary (`access`), con caché de 60 s.
// Lo que escribe la clínica lleva SIEMPRE su veterinary_id y empleado desde el token, nunca desde el body.

/** Qué necesita hacer el actor sobre una mascota. */
export type ClinicalNeed =
  | 'CLINICAL_READ' // historia completa
  | 'CLINICAL_READ_BASIC' // alergias, próxima cita, vacunas, último peso
  | 'CLINICAL_WRITE' // visitas, tratamientos, medicación, cirugías, laboratorios (solo clínica)
  | 'NURSING_WRITE' // vacunas (solo clínica)
  | 'WEIGHT_WRITE' // peso: dueño (OWNER) o clínica con NURSING_WRITE (CLINIC)
  | 'DOCUMENT_READ' // documentos de la mascota: solo clínica con CLINICAL_READ
  | 'DOCUMENT_WRITE'; // subir/borrar documentos: solo clínica con DOCUMENT_UPLOAD

/** Quién queda como autor del registro que se va a guardar. */
export interface Authorship {
  source: 'OWNER' | 'CLINIC';
  veterinaryId: string | null;
  employeeId: string | null;
  /** `sub` del token: el dueño, o el usuario del empleado de la clínica. */
  userId: string;
}

const CLINIC_PERMISSION: Record<Exclude<ClinicalNeed, 'WEIGHT_WRITE'>, ClinicPermission> = {
  CLINICAL_READ: 'CLINICAL_READ',
  CLINICAL_READ_BASIC: 'CLINICAL_READ_BASIC',
  CLINICAL_WRITE: 'CLINICAL_WRITE',
  NURSING_WRITE: 'NURSING_WRITE',
  DOCUMENT_READ: 'CLINICAL_READ',
  DOCUMENT_WRITE: 'DOCUMENT_UPLOAD',
};

const OWNER_CAN: Record<ClinicalNeed, boolean> = {
  CLINICAL_READ: true,
  CLINICAL_READ_BASIC: true,
  CLINICAL_WRITE: true,
  NURSING_WRITE: true,
  WEIGHT_WRITE: true,
  // Los documentos son exclusivos de la veterinaria: el dueño no los lee ni los sube
  DOCUMENT_READ: false,
  DOCUMENT_WRITE: false,
};

/**
 * Decide si el actor puede hacer `need` sobre `petId` y devuelve la autoría del registro.
 * - Token de clínica: exige el permiso en `access` (Veterinary). Sin permiso → 403.
 * - Token de dueño: exige ser dueño (Pets). Solo lectura y peso.
 * Si Veterinary o Pets no responden → 503 (lo lanza el cliente), nunca "pasa".
 */
export async function authorizePet(actor: Actor, petId: string, need: ClinicalNeed): Promise<Authorship> {
  if (actor.clinic) {
    const permission: ClinicPermission =
      need === 'WEIGHT_WRITE' ? 'NURSING_WRITE' : CLINIC_PERMISSION[need];

    const access = await getPetAccess(actor.clinic.veterinaryId, petId, actor.userId);
    if (!access.hasAccess) {
      throw new ForbiddenError('NO_ACCESS_TO_PET', 'La clínica no tiene acceso a esta mascota');
    }
    if (!access.permissions.includes(permission)) {
      throw new ForbiddenError('INSUFFICIENT_PERMISSION', `Falta el permiso ${permission}`);
    }

    return {
      source: 'CLINIC',
      veterinaryId: actor.clinic.veterinaryId,
      employeeId: access.employeeId ?? actor.clinic.employeeId,
      userId: actor.userId,
    };
  }

  if (!OWNER_CAN[need]) {
    throw new ForbiddenError(
      'CLINIC_TOKEN_REQUIRED',
      'Solo una clínica con permiso puede registrar esta información clínica'
    );
  }

  const owner = await isPetOwner(petId, actor.userId);
  if (!owner) {
    throw new ForbiddenError('PET_NOT_OWNED', 'La mascota no es tuya');
  }

  return { source: 'OWNER', veterinaryId: null, employeeId: null, userId: actor.userId };
}

/**
 * Para rutas que llevan `veterinaryId` en la ruta o en el body (MED-07, contrato §1.5):
 * el token de clínica solo puede consultar SU clínica.
 */
export function assertClinicPath(actor: Actor, veterinaryId: string): void {
  if (!actor.clinic) {
    throw new ForbiddenError('CLINIC_TOKEN_REQUIRED', 'Esta ruta requiere un token de clínica');
  }
  if (actor.clinic.veterinaryId !== veterinaryId) {
    throw new ForbiddenError('TENANT_MISMATCH', 'El veterinaryId no coincide con tu clínica');
  }
}
