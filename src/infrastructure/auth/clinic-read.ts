import { ForbiddenError } from '@/src/infrastructure/http/api-error';
import { Actor, ClinicActor } from './actor';

// Roles con CLINICAL_READ según la matriz de CONTRATOS_COMPARTIDOS.md §3.2.
// Las consultas que no son de una sola mascota (rangos, listados de la clínica) no tienen un
// endpoint `access` por mascota, así que se decide con el rol y estado del token de clínica.
// Un token puede tener hasta 15 min de antigüedad: para acciones sensibles, Veterinary manda.
const CLINICAL_READ_ROLES = ['OWNER', 'ADMIN', 'VETERINARIAN', 'ASSISTANT'];

export function requireClinicWithRead(actor: Actor): ClinicActor {
  const clinic = actor.clinic;
  if (!clinic) {
    throw new ForbiddenError('CLINIC_TOKEN_REQUIRED', 'Esta consulta requiere un token de clínica');
  }
  if (clinic.status !== 'ACTIVE') {
    throw new ForbiddenError('INSUFFICIENT_PERMISSION', 'La clínica no está activa');
  }
  if (!CLINICAL_READ_ROLES.includes(clinic.role)) {
    throw new ForbiddenError('INSUFFICIENT_PERMISSION', 'Tu rol no puede leer la historia clínica');
  }
  return clinic;
}
