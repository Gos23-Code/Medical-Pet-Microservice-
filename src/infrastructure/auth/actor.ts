import { UnauthorizedError } from '@/src/infrastructure/http/api-error';

// CONTRATOS_COMPARTIDOS.md §1.2 y §1.3. Medical valida el token por sí mismo (§1.1).

export const JWT_ISSUER = 'myanimalog-user-service';
export const JWT_AUDIENCE = 'myanimalog-api';

export interface ClinicActor {
  veterinaryId: string;
  employeeId: string;
  role: string;
  licensed: boolean;
  status: string;
}

/**
 * Quien hace la petición, leído del token. El `userId` sale SIEMPRE de `sub`:
 * nunca del body ni de la query (contrato §1.2).
 */
export interface Actor {
  userId: string;
  email: string;
  emailVerified: boolean;
  platformAdmin: boolean;
  /** Presente solo con token de contexto de clínica (`ctx = VETERINARY`). */
  clinic?: ClinicActor;
}

type Claims = Record<string, unknown>;

function readString(claims: Claims, key: string): string | undefined {
  const value = claims[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** Convierte los claims verificados de un JWT en un Actor. Lanza 401 si el token no es de usuario. */
export function toActor(claims: Claims): Actor {
  const userId = readString(claims, 'sub');
  if (!userId) {
    throw new UnauthorizedError('TOKEN_INVALID', 'El token no trae el claim sub');
  }

  const actor: Actor = {
    userId,
    email: readString(claims, 'email') ?? '',
    emailVerified: claims.email_verified === true,
    platformAdmin: claims.platform_role === 'PLATFORM_ADMIN',
  };

  if (claims.ctx === 'VETERINARY') {
    const veterinaryId = readString(claims, 'vet_id');
    const employeeId = readString(claims, 'employee_id');
    const role = readString(claims, 'vet_role');
    if (!veterinaryId || !employeeId || !role) {
      throw new UnauthorizedError('TOKEN_INVALID', 'Token de clínica incompleto');
    }
    actor.clinic = {
      veterinaryId,
      employeeId,
      role,
      licensed: claims.vet_licensed === true,
      status: readString(claims, 'vet_status') ?? 'UNKNOWN',
    };
  }

  return actor;
}
