import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { authorizePet, assertClinicPath } from '../clinical-access';
import { requireClinicWithRead } from '../clinic-read';
import { Actor } from '../actor';
import { getPetAccess, ClinicPermission } from '@/src/infrastructure/clients/veterinary.client';
import { isPetOwner } from '@/src/infrastructure/clients/pets.client';
import { ForbiddenError } from '@/src/infrastructure/http/api-error';

// Los clientes HTTP se simulan: aquí se prueba la regla de decisión, no la red (MED-03).
jest.mock('@/src/infrastructure/clients/veterinary.client', () => ({
  getPetAccess: jest.fn(),
}));
jest.mock('@/src/infrastructure/clients/pets.client', () => ({
  isPetOwner: jest.fn(),
}));

const mockGetPetAccess = getPetAccess as jest.MockedFunction<typeof getPetAccess>;
const mockIsPetOwner = isPetOwner as jest.MockedFunction<typeof isPetOwner>;

const owner: Actor = { userId: 'owner-1', email: '', emailVerified: true, platformAdmin: false };

const clinic = (role = 'VETERINARIAN', status = 'ACTIVE'): Actor => ({
  userId: 'vet-user-1',
  email: '',
  emailVerified: true,
  platformAdmin: false,
  clinic: { veterinaryId: 'vet-1', employeeId: 'emp-1', role, licensed: true, status },
});

const access = (permissions: ClinicPermission[], hasAccess = true) => ({
  hasAccess,
  veterinaryStatus: 'ACTIVE',
  employeeId: 'emp-1',
  role: 'VETERINARIAN',
  licensed: true,
  permissions,
});

describe('authorizePet: dueño (token USER)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lee su historia cuando Pets confirma que es dueño', async () => {
    mockIsPetOwner.mockResolvedValue(true);
    await expect(authorizePet(owner, 'pet-1', 'CLINICAL_READ')).resolves.toEqual({
      source: 'OWNER',
      veterinaryId: null,
      employeeId: null,
      userId: 'owner-1',
    });
    expect(mockIsPetOwner).toHaveBeenCalledWith('pet-1', 'owner-1');
  });

  it('registra peso con Source = OWNER', async () => {
    mockIsPetOwner.mockResolvedValue(true);
    const result = await authorizePet(owner, 'pet-1', 'WEIGHT_WRITE');
    expect(result.source).toBe('OWNER');
  });

  it('puede escribir historia de SU mascota (campos base, como antes)', async () => {
    mockIsPetOwner.mockResolvedValue(true);
    await expect(authorizePet(owner, 'pet-1', 'CLINICAL_WRITE')).resolves.toMatchObject({ source: 'OWNER' });
    await expect(authorizePet(owner, 'pet-1', 'NURSING_WRITE')).resolves.toMatchObject({ source: 'OWNER' });
  });

  it('no puede escribir historia de una mascota AJENA (403 PET_NOT_OWNED)', async () => {
    mockIsPetOwner.mockResolvedValue(false);
    await expect(authorizePet(owner, 'pet-9', 'CLINICAL_WRITE')).rejects.toMatchObject({ code: 'PET_NOT_OWNED' });
  });

  it('una mascota ajena responde 403 PET_NOT_OWNED', async () => {
    mockIsPetOwner.mockResolvedValue(false);
    await expect(authorizePet(owner, 'pet-9', 'CLINICAL_READ')).rejects.toMatchObject({
      status: 403,
      code: 'PET_NOT_OWNED',
    });
  });
});

describe('authorizePet: clínica (token VETERINARY)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('escribe historia con CLINICAL_WRITE y la autoría sale del token', async () => {
    mockGetPetAccess.mockResolvedValue(access(['CLINICAL_READ', 'CLINICAL_WRITE']));
    const result = await authorizePet(clinic(), 'pet-1', 'CLINICAL_WRITE');
    expect(result).toEqual({
      source: 'CLINIC',
      veterinaryId: 'vet-1',
      employeeId: 'emp-1',
      userId: 'vet-user-1',
    });
    expect(mockGetPetAccess).toHaveBeenCalledWith('vet-1', 'pet-1', 'vet-user-1');
    expect(mockIsPetOwner).not.toHaveBeenCalled();
  });

  it('el peso exige NURSING_WRITE y deja Source = CLINIC', async () => {
    mockGetPetAccess.mockResolvedValue(access(['NURSING_WRITE']));
    const result = await authorizePet(clinic(), 'pet-1', 'WEIGHT_WRITE');
    expect(result.source).toBe('CLINIC');
  });

  it('sin el permiso exacto responde 403 INSUFFICIENT_PERMISSION', async () => {
    mockGetPetAccess.mockResolvedValue(access(['CLINICAL_READ']));
    await expect(authorizePet(clinic(), 'pet-1', 'CLINICAL_WRITE')).rejects.toMatchObject({
      status: 403,
      code: 'INSUFFICIENT_PERMISSION',
    });
  });

  it('sin acceso a la mascota responde 403 NO_ACCESS_TO_PET', async () => {
    mockGetPetAccess.mockResolvedValue(access([], false));
    await expect(authorizePet(clinic(), 'pet-1', 'CLINICAL_READ')).rejects.toMatchObject({
      code: 'NO_ACCESS_TO_PET',
    });
  });

  it('si Veterinary no responde, el error se propaga (503, nunca "pasa")', async () => {
    const { ServiceUnavailableError } = await import('@/src/infrastructure/http/api-error');
    mockGetPetAccess.mockRejectedValue(new ServiceUnavailableError());
    await expect(authorizePet(clinic(), 'pet-1', 'CLINICAL_READ')).rejects.toMatchObject({ status: 503 });
  });
});

describe('assertClinicPath (CONTRATOS §1.5)', () => {
  it('permite la clínica del token', () => {
    expect(() => assertClinicPath(clinic(), 'vet-1')).not.toThrow();
  });

  it('bloquea otra clínica con TENANT_MISMATCH', () => {
    expect(() => assertClinicPath(clinic(), 'vet-2')).toThrow(ForbiddenError);
    try {
      assertClinicPath(clinic(), 'vet-2');
    } catch (error) {
      expect((error as ForbiddenError).code).toBe('TENANT_MISMATCH');
    }
  });

  it('bloquea un token de dueño', () => {
    expect(() => assertClinicPath(owner, 'vet-1')).toThrow(/requiere un token de clínica/);
  });
});

describe('requireClinicWithRead', () => {
  it('acepta VETERINARIAN activo', () => {
    expect(requireClinicWithRead(clinic('VETERINARIAN')).veterinaryId).toBe('vet-1');
  });

  it('rechaza RECEPTIONIST (no tiene CLINICAL_READ)', () => {
    expect(() => requireClinicWithRead(clinic('RECEPTIONIST'))).toThrow(ForbiddenError);
  });

  it('rechaza una clínica que no está ACTIVE', () => {
    expect(() => requireClinicWithRead(clinic('OWNER', 'SUSPENDED'))).toThrow(ForbiddenError);
  });
});
