import { timingSafeEqual } from 'crypto';
import { ApiError, UnauthorizedError } from '@/src/infrastructure/http/api-error';

// CONTRATOS_COMPARTIDOS.md §2: rutas internas y cron jobs usan X-Internal-Api-Key, nunca JWT de usuario.

export const INTERNAL_KEY_HEADER = 'x-internal-api-key';

export function assertInternalKey(request: Request): void {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    throw new ApiError(500, 'CONFIG_MISSING', 'Falta la variable INTERNAL_API_KEY');
  }

  const received = request.headers.get(INTERNAL_KEY_HEADER) ?? '';
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  // timingSafeEqual exige longitudes iguales; la longitud distinta ya es un rechazo.
  const matches =
    expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  if (!matches) {
    throw new UnauthorizedError('INTERNAL_KEY_INVALID', 'X-Internal-Api-Key inválida o ausente');
  }
}
