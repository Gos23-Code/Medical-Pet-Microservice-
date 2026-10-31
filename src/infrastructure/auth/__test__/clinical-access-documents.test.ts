import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { authorizePet } from '../clinical-access';
import { Actor } from '../actor';
import { getPetAccess, ClinicPermission } from '@/src/infrastructure/clients/veterinary.client';
import { isPetOwner } from '@/src/infrastructure/clients/pets.client';

// Documentos y lista de la historia: son EXCLUSIVOS de la veterinaria. El dueño nunca los lee ni los sube.
jest.mock('@/src/infrastructure/clients/veterinary.client', () => ({ getPetAccess: jest.fn() }));
jest.mock('@/src/infrastructure/clients/pets.client', () => ({ isPetOwner: jest.fn() }));

const mockAccess = getPetAccess as jest.MockedFunction<typeof getPetAccess>;
const mockOwner = isPetOwner as jest.MockedFunction<typeof isPetOwner>;

const owner: Actor = { userId: 'owner-1', email: '', emailVerified: true, platformAdmin: false };
const clinic: Actor = {
  userId: 'vet-user-1', email: '', emailVerified: true, platformAdmin: false,
  clinic: { veterinaryId: 'vet-1', employeeId: 'emp-1', role: 'VETERINARIAN', licensed: true, status: 'ACTIVE' },
};

const grant = (permissions: ClinicPermission[]) => ({
  hasAccess: true, veterinaryStatus: 'ACTIVE', employeeId: 'emp-1', role: 'VETERINARIAN', licensed: true, permissions,
});

describe('documentos: exclusivos de la clínica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwner.mockResolvedValue(true);
  });

  it('el dueño de la mascota recibe 403 al leer documentos, aunque sea suyo', async () => {
    await expect(authorizePet(owner, 'pet-1', 'DOCUMENT_READ')).rejects.toMatchObject({
      status: 403, code: 'CLINIC_TOKEN_REQUIRED',
    });
    expect(mockOwner).not.toHaveBeenCalled();
  });

  it('el dueño recibe 403 al subir documentos', async () => {
    await expect(authorizePet(owner, 'pet-1', 'DOCUMENT_WRITE')).rejects.toMatchObject({
      status: 403, code: 'CLINIC_TOKEN_REQUIRED',
    });
  });

  it('la clínica con CLINICAL_READ puede leer documentos', async () => {
    mockAccess.mockResolvedValue(grant(['CLINICAL_READ']));
    await expect(authorizePet(clinic, 'pet-1', 'DOCUMENT_READ')).resolves.toMatchObject({ source: 'CLINIC' });
  });

  it('la clínica sin DOCUMENT_UPLOAD no puede subir (403 INSUFFICIENT_PERMISSION)', async () => {
    mockAccess.mockResolvedValue(grant(['CLINICAL_READ', 'CLINICAL_WRITE']));
    await expect(authorizePet(clinic, 'pet-1', 'DOCUMENT_WRITE')).rejects.toMatchObject({
      status: 403, code: 'INSUFFICIENT_PERMISSION',
    });
  });

  it('la clínica con DOCUMENT_UPLOAD puede subir', async () => {
    mockAccess.mockResolvedValue(grant(['DOCUMENT_UPLOAD']));
    await expect(authorizePet(clinic, 'pet-1', 'DOCUMENT_WRITE')).resolves.toMatchObject({ veterinaryId: 'vet-1' });
  });
});
