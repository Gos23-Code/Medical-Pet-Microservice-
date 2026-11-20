import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { postCorrection, getVersions, overwriteRefused, CorrectionRouteConfig } from '../correction-handlers';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { ClinicalCorrectionRepository, ApplyCorrectionInput } from '@/src/domain/repositories/clinical-correction.repository';
import { ActRef } from '@/src/application/clinical/act-integrity';
import { ForbiddenError } from '@/src/infrastructure/http/api-error';

// Capa HTTP de las correcciones: se prueba el manejador con el permiso y el repositorio simulados.
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers,
    }),
  },
}));
jest.mock('@/src/infrastructure/auth/clinical-access', () => ({ authorizePet: jest.fn() }));

const mockAuthorizePet = authorizePet as jest.MockedFunction<typeof authorizePet>;

const PET = 'pet-1';
const RECORD = 'vac-1';
const VET_A = 'vet-a';
const VET_B = 'vet-b';

const config: CorrectionRouteConfig = {
  table: 'vaccines',
  petIdOf: async () => PET,
  writeNeed: 'NURSING_WRITE',
  fields: ['name', 'lotNumber'],
};

/** Repositorio simulado: la fila original no tiene UPDATE; la transacción falla si la auditoría falla. */
class FakeRepo implements ClinicalCorrectionRepository {
  versions: Array<ApplyCorrectionInput & { version: number }> = [];
  act: ActRef = { source: 'CLINIC', veterinaryId: VET_A, createdByUserId: 'emp-1' };
  auditFails = false;

  async getActRef(): Promise<ActRef | null> {
    return this.act;
  }
  async applyCorrection(input: ApplyCorrectionInput): Promise<number> {
    if (this.auditFails) throw new Error('audit insert failed');
    const version = this.versions.length + 1;
    this.versions.push({ ...input, version });
    return version;
  }
  async listVersions() {
    return this.versions.map((v) => ({
      version: v.version,
      kind: 'CORRECTION' as const,
      values: v.values,
      reason: v.reason,
      authorUserId: v.authorUserId,
      authorEmployeeId: v.authorEmployeeId,
      veterinaryId: v.veterinaryId,
      authorRole: v.authorRole,
      createdAt: '2026-11-19T00:00:00Z',
    }));
  }
}

const clinicA = { userId: 'emp-user-1', email: '', emailVerified: true, platformAdmin: false, clinic: { veterinaryId: VET_A, employeeId: 'emp-1', role: 'VETERINARIAN', licensed: true, status: 'ACTIVE' } };
const clinicB = { userId: 'emp-user-9', email: '', emailVerified: true, platformAdmin: false, clinic: { veterinaryId: VET_B, employeeId: 'emp-9', role: 'VETERINARIAN', licensed: true, status: 'ACTIVE' } };
const owner = { userId: 'owner-1', email: '', emailVerified: true, platformAdmin: false };

const clinicAuth = { source: 'CLINIC' as const, veterinaryId: VET_A, employeeId: 'emp-1', userId: 'emp-user-1' };
const ownerAuth = { source: 'OWNER' as const, veterinaryId: null, employeeId: null, userId: 'owner-1' };

function postRequest(body: unknown) {
  return new Request('http://localhost/api/vaccines/vac-1/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<ReturnType<typeof postCorrection>>[0];
}

const ctx = { params: Promise.resolve({ id: RECORD }) };

describe('POST corrección (manejador HTTP)', () => {
  let repo: FakeRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new FakeRepo();
  });

  it('positivo: el veterinario autor corrige con motivo → 201 con la versión; la original no cambia', async () => {
    mockAuthorizePet.mockResolvedValue(clinicAuth);
    const handler = postCorrection(config, repo);

    const response = await handler(postRequest({ reason: 'Lote mal escrito', lotNumber: 'L-9' }), ctx, clinicA);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ version: 1, recordId: RECORD });
    expect(repo.versions[0]).toMatchObject({
      recordId: RECORD,
      reason: 'Lote mal escrito',
      authorRole: 'CLINIC',
      veterinaryId: VET_A,
      values: { lotNumber: 'L-9' },
    });
    expect(repo.act).toEqual({ source: 'CLINIC', veterinaryId: VET_A, createdByUserId: 'emp-1' });
  });

  it('positivo: el campo que no está en la lista se ignora (no entra a la versión)', async () => {
    mockAuthorizePet.mockResolvedValue(clinicAuth);
    await postCorrection(config, repo)(postRequest({ reason: 'Corrección', lotNumber: 'L-1', userId: 'otro' }), ctx, clinicA);
    expect(repo.versions[0].values).toEqual({ lotNumber: 'L-1' });
  });

  it('negativo: el propietario intenta corregir una vacuna de un veterinario → 403', async () => {
    mockAuthorizePet.mockResolvedValue(ownerAuth);
    await expect(postCorrection(config, repo)(postRequest({ reason: 'Intento' }), ctx, owner)).rejects.toMatchObject({
      status: 403,
      code: 'OWNER_CANNOT_CORRECT_CLINIC_ACT',
    });
    expect(repo.versions).toHaveLength(0);
  });

  it('negativo: la clínica B intenta corregir un acto de la clínica A → 403', async () => {
    mockAuthorizePet.mockResolvedValue({ ...clinicAuth, veterinaryId: VET_B, userId: 'emp-user-9' });
    await expect(postCorrection(config, repo)(postRequest({ reason: 'Intento' }), ctx, clinicB)).rejects.toMatchObject({
      status: 403,
      code: 'OTHER_CLINIC_ACT',
    });
    expect(repo.versions).toHaveLength(0);
  });

  it('negativo: corregir sin motivo → 400', async () => {
    mockAuthorizePet.mockResolvedValue(clinicAuth);
    await expect(postCorrection(config, repo)(postRequest({ lotNumber: 'L-1' }), ctx, clinicA)).rejects.toMatchObject({
      status: 400,
      code: 'REASON_REQUIRED',
    });
    expect(repo.versions).toHaveLength(0);
  });

  it('negativo: si la auditoría falla, la corrección no se guarda', async () => {
    mockAuthorizePet.mockResolvedValue(clinicAuth);
    repo.auditFails = true;
    await expect(postCorrection(config, repo)(postRequest({ reason: 'Corrección válida' }), ctx, clinicA)).rejects.toThrow(
      'audit insert failed'
    );
    expect(repo.versions).toHaveLength(0);
  });

  it('negativo: sin permiso sobre la mascota (Veterinary) → 403 y nada se escribe', async () => {
    mockAuthorizePet.mockRejectedValue(new ForbiddenError('NO_ACCESS_TO_PET', 'La clínica no tiene acceso a esta mascota'));
    await expect(postCorrection(config, repo)(postRequest({ reason: 'Intento' }), ctx, clinicA)).rejects.toMatchObject({
      code: 'NO_ACCESS_TO_PET',
    });
    expect(repo.versions).toHaveLength(0);
  });

  it('negativo: acto inexistente → 404', async () => {
    mockAuthorizePet.mockResolvedValue(clinicAuth);
    const handler = postCorrection({ ...config, petIdOf: async () => null }, repo);
    await expect(handler(postRequest({ reason: 'Corrección' }), ctx, clinicA)).rejects.toMatchObject({ status: 404 });
  });
});

describe('GET versiones (manejador HTTP)', () => {
  it('positivo: lista las versiones del acto con 200', async () => {
    mockAuthorizePet.mockResolvedValue(ownerAuth);
    const repo = new FakeRepo();
    repo.versions.push({
      table: 'vaccines',
      recordId: RECORD,
      reason: 'Corrección',
      values: { lotNumber: 'L-2' },
      authorUserId: 'emp-user-1',
      authorEmployeeId: 'emp-1',
      veterinaryId: VET_A,
      authorRole: 'CLINIC',
      version: 1,
    });
    const response = await getVersions(config, repo)(new Request('http://localhost') as never, ctx, owner);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('PUT/PATCH antiguos', () => {
  it('negativo: responden 405 USE_CORRECTION_ENDPOINT y no escriben nada', async () => {
    const response = await overwriteRefused('/api/vaccines/{id}/corrections')();
    expect(response.status).toBe(405);
    expect(response.body).toMatchObject({ code: 'USE_CORRECTION_ENDPOINT' });
    expect((response as unknown as { body: { message: string } }).body.message).toContain('/api/vaccines/{id}/corrections');
  });
});
