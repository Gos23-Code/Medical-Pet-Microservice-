import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { errors } from 'jose';
import { toActor } from '../actor';
import { authenticate, readBearerToken } from '../jwt';
import { assertInternalKey } from '../internal-key';
import { UnauthorizedError } from '@/src/infrastructure/http/api-error';

// Mismo patrón que pubsub-envelope.test.ts: jose se simula; aquí solo interesa la traducción de claims.
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) },
}));

const ownerClaims = {
  sub: 'owner-1',
  email: 'dueno@correo.com',
  email_verified: true,
  platform_role: 'USER',
  ctx: 'USER',
};

const clinicClaims = {
  ...ownerClaims,
  sub: 'vet-user-1',
  ctx: 'VETERINARY',
  vet_id: 'vet-1',
  employee_id: 'emp-1',
  vet_role: 'VETERINARIAN',
  vet_licensed: true,
  vet_status: 'ACTIVE',
};

describe('toActor (CONTRATOS §1.2 y §1.3)', () => {
  it('toma el userId de sub y no del body', () => {
    expect(toActor(ownerClaims)).toEqual({
      userId: 'owner-1',
      email: 'dueno@correo.com',
      emailVerified: true,
      platformAdmin: false,
    });
  });

  it('expone el contexto de clínica solo con ctx = VETERINARY', () => {
    const actor = toActor(clinicClaims);
    expect(actor.clinic).toEqual({
      veterinaryId: 'vet-1',
      employeeId: 'emp-1',
      role: 'VETERINARIAN',
      licensed: true,
      status: 'ACTIVE',
    });
  });

  it('rechaza un token sin sub', () => {
    expect(() => toActor({ ...ownerClaims, sub: '' })).toThrow(UnauthorizedError);
  });

  it('rechaza un token de clínica incompleto', () => {
    expect(() => toActor({ ...clinicClaims, vet_id: undefined })).toThrow(/incompleto/);
  });

  it('marca PLATFORM_ADMIN solo con ese claim', () => {
    expect(toActor({ ...ownerClaims, platform_role: 'PLATFORM_ADMIN' }).platformAdmin).toBe(true);
  });
});

describe('readBearerToken', () => {
  it('exige el prefijo Bearer', () => {
    expect(() => readBearerToken(null)).toThrow(UnauthorizedError);
    expect(() => readBearerToken('Basic abc')).toThrow(UnauthorizedError);
  });

  it('devuelve el token sin el prefijo', () => {
    expect(readBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });
});

describe('authenticate', () => {
  const request = (authorization: string | null) =>
    ({ headers: new Headers(authorization ? { authorization } : {}) }) as unknown as Request;

  it('devuelve el Actor cuando la verificación pasa', async () => {
    const verify = jest.fn<(token: string) => Promise<Record<string, unknown>>>().mockResolvedValue(ownerClaims);
    const actor = await authenticate(request('Bearer t1'), verify);
    expect(verify).toHaveBeenCalledWith('t1');
    expect(actor.userId).toBe('owner-1');
  });

  it('responde TOKEN_EXPIRED cuando el JWT venció', async () => {
    const verify = async () => {
      throw new errors.JWTExpired('expired', {});
    };
    await expect(authenticate(request('Bearer t1'), verify)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
  });

  it('responde TOKEN_INVALID ante firma inválida', async () => {
    const verify = async () => {
      throw new errors.JWSSignatureVerificationFailed('signature');
    };
    await expect(authenticate(request('Bearer t1'), verify)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_INVALID',
    });
  });
});

describe('assertInternalKey (CONTRATOS §2)', () => {
  const original = process.env.INTERNAL_API_KEY;

  afterEach(() => {
    process.env.INTERNAL_API_KEY = original;
  });

  const request = (key?: string) =>
    ({ headers: new Headers(key ? { 'x-internal-api-key': key } : {}) }) as unknown as Request;

  it('acepta la clave correcta', () => {
    process.env.INTERNAL_API_KEY = 'secreto-123';
    expect(() => assertInternalKey(request('secreto-123'))).not.toThrow();
  });

  it('rechaza una clave distinta o ausente con 401', () => {
    process.env.INTERNAL_API_KEY = 'secreto-123';
    expect(() => assertInternalKey(request('otra'))).toThrow(UnauthorizedError);
    expect(() => assertInternalKey(request())).toThrow(UnauthorizedError);
  });

  it('falla de forma explícita si la variable no está configurada', () => {
    delete process.env.INTERNAL_API_KEY;
    expect(() => assertInternalKey(request('x'))).toThrow(/INTERNAL_API_KEY/);
  });
});

describe('authenticate: JWKS no alcanzable', () => {
  it('responde 503 (no 401) cuando el JWKS no se puede obtener', async () => {
    const { ServiceUnavailableError } = await import('@/src/infrastructure/http/api-error');
    const request = { headers: new Headers({ authorization: 'Bearer t1' }) } as unknown as Request;
    const verify = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(authenticate(request, verify)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
