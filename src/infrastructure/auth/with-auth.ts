import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/src/infrastructure/http/api-error';
import { Actor } from './actor';
import { authenticate } from './jwt';

export type AuthedHandler<C> = (req: NextRequest, context: C, actor: Actor) => Promise<NextResponse>;

/**
 * Envuelve un route handler: exige token, entrega el `Actor` al handler y convierte
 * cualquier `ApiError` en la respuesta del contrato (401/403/409/503).
 */
export function withAuth<C = unknown>(handler: AuthedHandler<C>) {
  return async (req: NextRequest, context: C): Promise<NextResponse> => {
    try {
      const actor = await authenticate(req);
      return await handler(req, context, actor);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
