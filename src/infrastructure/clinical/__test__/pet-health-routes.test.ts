import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Pruebas HTTP de las rutas de datos clínicos: se ejecutan los handlers reales con el token,
// el permiso y los repositorios simulados. Así se prueba el código de cada ruta, no solo los casos de uso.

let mockActor: unknown;
const mockAuthorizePet = jest.fn<(actor: unknown, petId: string, need: string) => Promise<unknown>>();
const mockPetIdOfAllergy = jest.fn<(id: string) => Promise<string | null>>();
const mockHealth = new Map<string, unknown>();

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

jest.mock('@/src/infrastructure/auth/with-auth', () => {
  const { toErrorResponse } = jest.requireActual<typeof import('@/src/infrastructure/http/api-error')>(
    '@/src/infrastructure/http/api-error'
  );
  return {
    withAuth: (handler: (req: unknown, ctx: unknown, actor: unknown) => Promise<unknown>) => async (req: unknown, ctx: unknown) => {
      try {
        return await handler(req, ctx, mockActor);
      } catch (error) {
        return toErrorResponse(error);
      }
    },
  };
});

jest.mock('@/src/infrastructure/auth/clinical-access', () => ({
  authorizePet: (actor: unknown, petId: string, need: string) => mockAuthorizePet(actor, petId, need),
}));

jest.mock('@/src/infrastructure/database/pet-lookup', () => ({
  petIdOfAllergy: (id: string) => mockPetIdOfAllergy(id),
  petIdOfDeworming: async () => 'pet-1',
}));

jest.mock('@/src/infrastructure/clinical/pet-birth-date', () => ({ petBirthDate: async () => null }));

// Repositorio en memoria para las rutas (sustituye a Supabase; el resto del código es el real).
jest.mock('@/src/infrastructure/clinical/pet-health-http', () => {
  const actual = jest.requireActual<typeof import('@/src/infrastructure/clinical/pet-health-http')>(
    '@/src/infrastructure/clinical/pet-health-http'
  );
  const allergies: Array<Record<string, unknown>> = [];
  const dewormings: Array<Record<string, unknown>> = [];
  const profiles = new Map<string, unknown>();
  const repo = {
    insertAllergy: async (a: Record<string, unknown>) => {
      const id = `alg-${allergies.length + 1}`;
      allergies.push({ ...a, id, createdAt: '2026-11-19T10:00:00Z' });
      return id;
    },
    findAllergyById: async (id: string) => allergies.find((a) => a.id === id) ?? null,
    findAllergiesByPet: async (petId: string) => allergies.filter((a) => a.petId === petId),
    insertDeworming: async (d: Record<string, unknown>) => {
      const id = `dew-${dewormings.length + 1}`;
      dewormings.push({ ...d, id, status: 'ACTIVE', createdAt: '2026-11-19T10:00:00Z' });
      return id;
    },
    findDewormingById: async (id: string) => dewormings.find((d) => d.id === id) ?? null,
    findDewormingsByPet: async (petId: string) => dewormings.filter((d) => d.petId === petId),
    findProfile: async (petId: string) => profiles.get(petId) ?? null,
    saveProfile: async (p: { petId: string }) => {
      profiles.set(p.petId, p);
    },
    listVersions: async () => [],
  };
  const audit = { record: async () => undefined };
  const corrections = {
    getActRef: async () => null,
    applyCorrection: async () => 1,
    listVersions: async () => [],
  };
  return {
    ...actual,
    petHealthRepository: () => repo,
    auditRepository: () => audit,
    correctionRepository: () => corrections,
  };
});

import { GET as allergiesGet, POST as allergiesPost } from '@/app/api/allergies/route';
import { POST as confirmPost } from '@/app/api/allergies/[id]/confirm/route';
import { POST as dewormingPost } from '@/app/api/dewormings/route';

const OWNER = { userId: 'owner-1', email: '', emailVerified: true, platformAdmin: false };
const CLINIC = {
  userId: 'emp-user-1',
  email: '',
  emailVerified: true,
  platformAdmin: false,
  clinic: { veterinaryId: 'vet-a', employeeId: 'emp-1', role: 'VETERINARIAN', licensed: true, status: 'ACTIVE' },
};
const ownerAuth = { source: 'OWNER', veterinaryId: null, employeeId: null, userId: 'owner-1' };
const clinicAuth = { source: 'CLINIC', veterinaryId: 'vet-a', employeeId: 'emp-1', userId: 'emp-user-1' };

function request(url: string, body?: unknown): never {
  const req = new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return Object.assign(req, { nextUrl: new URL(url) }) as never;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

type Response = { body: Record<string, unknown>; status: number };

describe('rutas de datos clínicos (HTTP)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealth.clear();
  });

  describe('GET y POST /api/allergies', () => {
    it('positivo: el dueño declara una alergia y queda SUSPECTED (201)', async () => {
      mockActor = OWNER;
      mockAuthorizePet.mockResolvedValue(ownerAuth);
      const response = (await allergiesPost(request('http://x/api/allergies', { petId: 'pet-1', allergen: 'Penicilina', severity: 'SEVERE' }), undefined as never)) as unknown as Response;
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ status: 'SUSPECTED' });
      expect(mockAuthorizePet).toHaveBeenCalledWith(OWNER, 'pet-1', 'CLINICAL_WRITE');
    });

    it('positivo: la clínica registra una alergia CONFIRMED (201)', async () => {
      mockActor = CLINIC;
      mockAuthorizePet.mockResolvedValue(clinicAuth);
      const response = (await allergiesPost(request('http://x/api/allergies', { petId: 'pet-1', allergen: 'Pollo', severity: 'MILD' }), undefined as never)) as unknown as Response;
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ status: 'CONFIRMED' });
    });

    it('negativo: sin petId → 400 y no se autoriza nada', async () => {
      mockActor = OWNER;
      const response = (await allergiesPost(request('http://x/api/allergies', { allergen: 'Pollo' }), undefined as never)) as unknown as Response;
      expect(response.status).toBe(400);
      expect(mockAuthorizePet).not.toHaveBeenCalled();
    });

    it('negativo: sin permiso sobre la mascota → 403 con el código de Pets/Veterinary', async () => {
      mockActor = CLINIC;
      const { ForbiddenError } = jest.requireActual<typeof import('@/src/infrastructure/http/api-error')>('@/src/infrastructure/http/api-error');
      mockAuthorizePet.mockRejectedValue(new ForbiddenError('NO_ACCESS_TO_PET', 'sin acceso'));
      const response = (await allergiesPost(request('http://x/api/allergies', { petId: 'pet-9', allergen: 'Pollo', severity: 'MILD' }), undefined as never)) as unknown as Response;
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'NO_ACCESS_TO_PET' });
    });

    it('GET: sin petId → 400; con petId → estado y lista (200)', async () => {
      mockActor = OWNER;
      mockAuthorizePet.mockResolvedValue(ownerAuth);
      const missing = (await allergiesGet(request('http://x/api/allergies'), undefined as never)) as unknown as Response;
      expect(missing.status).toBe(400);

      const ok = (await allergiesGet(request('http://x/api/allergies?petId=pet-sin-alergias'), undefined as never)) as unknown as Response;
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ petId: 'pet-sin-alergias', allergyStatus: 'UNKNOWN', allergies: [] });
    });
  });

  describe('POST /api/allergies/[id]/confirm', () => {
    it('negativo: el dueño no puede confirmar su alergia → 403 OWNER_CANNOT_CONFIRM', async () => {
      mockActor = OWNER;
      mockAuthorizePet.mockResolvedValue(ownerAuth);
      mockPetIdOfAllergy.mockResolvedValue('pet-1');
      const created = (await allergiesPost(request('http://x/api/allergies', { petId: 'pet-1', allergen: 'Penicilina', severity: 'SEVERE' }), undefined as never)) as unknown as Response;
      const response = (await confirmPost(request(`http://x/api/allergies/${(created.body as { id: string }).id}/confirm`, {}), ctx((created.body as { id: string }).id) as never)) as unknown as Response;
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'OWNER_CANNOT_CONFIRM' });
    });

    it('negativo: alergia inexistente → 404 y no se autoriza', async () => {
      mockActor = CLINIC;
      mockPetIdOfAllergy.mockResolvedValue(null);
      const response = (await confirmPost(request('http://x/api/allergies/nope/confirm', {}), ctx('nope') as never)) as unknown as Response;
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'ALLERGY_NOT_FOUND' });
      expect(mockAuthorizePet).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/dewormings', () => {
    it('positivo: el dueño registra la última dosis (201) con NURSING_WRITE', async () => {
      mockActor = OWNER;
      mockAuthorizePet.mockResolvedValue(ownerAuth);
      const response = (await dewormingPost(
        request('http://x/api/dewormings', { petId: 'pet-1', kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-10-01' }),
        undefined as never
      )) as unknown as Response;
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('nextDoseDate');
      expect(mockAuthorizePet).toHaveBeenCalledWith(OWNER, 'pet-1', 'NURSING_WRITE');
    });

    it('negativo: fecha futura → 400', async () => {
      mockActor = OWNER;
      mockAuthorizePet.mockResolvedValue(ownerAuth);
      const response = (await dewormingPost(
        request('http://x/api/dewormings', { petId: 'pet-1', kind: 'INTERNAL', product: 'Drontal', applicationDate: '2099-01-01' }),
        undefined as never
      )) as unknown as Response;
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });
});
