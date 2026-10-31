import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { NextRequest } from 'next/server';
import { ApiError, ServiceUnavailableError, UnauthorizedError } from '@/src/infrastructure/http/api-error';
import { Actor, JWT_AUDIENCE, JWT_ISSUER, toActor } from './actor';

// MED-01: validación RS256 contra el JWKS del User service (CONTRATOS §1.1).
// Las llaves se cachean dentro de `jose` y se refrescan solas ante un `kid` desconocido.

let jwks: JWTVerifyGetKey | null = null;

function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    const uri = process.env.JWT_JWKS_URI;
    if (!uri) {
      throw new ApiError(500, 'CONFIG_MISSING', 'Falta la variable JWT_JWKS_URI');
    }
    jwks = createRemoteJWKSet(new URL(uri), { cacheMaxAge: 10 * 60 * 1000 });
  }
  return jwks;
}

export async function verifyBearerToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return payload;
}

export function readBearerToken(authorization: string | null): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedError('TOKEN_INVALID', 'Falta el header Authorization: Bearer <token>');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedError('TOKEN_INVALID', 'Token vacío');
  }
  return token;
}

/**
 * Autentica la petición. `verify` se inyecta para poder probarlo sin JWKS real.
 * Un JWT vencido responde `TOKEN_EXPIRED` (la app intenta refresh); cualquier otro
 * fallo responde `TOKEN_INVALID`.
 */
export async function authenticate(
  request: NextRequest | Request,
  verify: (token: string) => Promise<JWTPayload> = verifyBearerToken
): Promise<Actor> {
  const token = readBearerToken(request.headers.get('authorization'));
  try {
    const claims = await verify(token);
    return toActor(claims);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ApiError) {
      throw error;
    }
    if (error instanceof errors.JWTExpired) {
      throw new UnauthorizedError('TOKEN_EXPIRED', 'El token venció');
    }
    // Error de JOSE = el token no pasa la verificación (firma, claims, kid desconocido).
    if (error instanceof errors.JOSEError) {
      throw new UnauthorizedError('TOKEN_INVALID', 'Token inválido');
    }
    // Cualquier otra cosa (JWKS no alcanzable, red caída) es un problema de infraestructura, no del token.
    throw new ServiceUnavailableError('No se pudo obtener el JWKS de verificación (JWT_JWKS_URI)');
  }
}
