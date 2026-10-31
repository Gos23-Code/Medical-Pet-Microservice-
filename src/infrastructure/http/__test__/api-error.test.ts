import { describe, it, expect, jest } from '@jest/globals';
import {
  ConflictError,
  ForbiddenError,
  ServiceUnavailableError,
  UnauthorizedError,
  toErrorResponse,
} from '../api-error';

// CONTRATOS §5: { timestamp, status, error, message, code }.
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: Record<string, unknown>, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

type FakeResponse = { body: Record<string, unknown>; status: number };

describe('toErrorResponse', () => {
  it('convierte un ApiError en el formato del contrato con code estable', () => {
    const response = toErrorResponse(new ForbiddenError('PET_NOT_OWNED', 'La mascota no es tuya')) as unknown as FakeResponse;

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: 403,
      error: 'Forbidden',
      message: 'La mascota no es tuya',
      code: 'PET_NOT_OWNED',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  it.each([
    [new UnauthorizedError(), 401],
    [new ConflictError('APPOINTMENT_ALREADY_ATTENDED', 'x'), 409],
    [new ServiceUnavailableError(), 503],
  ])('mapea el status del error (%#)', (error, status) => {
    expect((toErrorResponse(error) as unknown as FakeResponse).status).toBe(status);
  });

  it('un error inesperado responde 500 sin filtrar el detalle', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = toErrorResponse(new Error('detalle interno')) as unknown as FakeResponse;

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
    expect(response.body.message).toBe('Error interno del servidor');
    errorSpy.mockRestore();
  });
});
