import { NextResponse } from 'next/server';

// CONTRATOS_COMPARTIDOS.md §5 y §3 (VET): errores con { timestamp, status, error, message, code }.
// `code` es estable: el cliente decide el texto por `code`, no por `message`.

const REASON_PHRASE: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 401: token ausente, vencido o firma inválida. */
export class UnauthorizedError extends ApiError {
  constructor(code = 'TOKEN_INVALID', message = 'Token ausente o inválido') {
    super(401, code, message);
    this.name = 'UnauthorizedError';
  }
}

/** 403: token válido pero sin permiso, otra clínica o mascota ajena. */
export class ForbiddenError extends ApiError {
  constructor(code = 'INSUFFICIENT_PERMISSION', message = 'No tienes permiso para esta operación') {
    super(403, code, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(code = 'NOT_FOUND', message = 'Recurso no encontrado') {
    super(404, code, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(code: string, message: string) {
    super(409, code, message);
    this.name = 'ConflictError';
  }
}

/** 503: otro servicio no respondió. Nunca se trata como "sin permiso". */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Un servicio interno no está disponible, intenta de nuevo') {
    super(503, 'EXTERNAL_SERVICE_UNAVAILABLE', message);
    this.name = 'ServiceUnavailableError';
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: error.status,
        error: REASON_PHRASE[error.status] ?? 'Error',
        message: error.message,
        code: error.code,
      },
      { status: error.status }
    );
  }

  console.error('❌ Error no controlado:', error);
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      status: 500,
      error: REASON_PHRASE[500],
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
