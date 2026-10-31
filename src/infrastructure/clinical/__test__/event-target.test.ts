import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { resolveEventTarget } from '../event-target';
import { getPets, PetSummary } from '@/src/infrastructure/clients/pets.client';
import { getVeterinaryName } from '@/src/infrastructure/clients/veterinary.client';

// MED-06: el destinatario sale de Pets, nunca del body. Sin Pets no hay evento, pero no se tumba la respuesta.
jest.mock('@/src/infrastructure/clients/pets.client', () => ({ getPets: jest.fn() }));
jest.mock('@/src/infrastructure/clients/veterinary.client', () => ({ getVeterinaryName: jest.fn() }));

const mockGetPets = getPets as jest.MockedFunction<typeof getPets>;
const mockGetVeterinaryName = getVeterinaryName as jest.MockedFunction<typeof getVeterinaryName>;

const petWith = (overrides: Partial<PetSummary>): Map<string, PetSummary> =>
  new Map([
    [
      'pet-1',
      {
        id: 'pet-1',
        ownerId: 'owner-1',
        name: 'Max',
        claimStatus: 'CLAIMED',
        ownerContact: null,
        ...overrides,
      },
    ],
  ]);

describe('resolveEventTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVeterinaryName.mockResolvedValue('Clínica Patitas');
  });

  it('notifica al dueño con cuenta y agrega la clínica que atendió', async () => {
    mockGetPets.mockResolvedValue(petWith({}));
    const target = await resolveEventTarget('pet-1', { veterinaryId: 'vet-1' });
    expect(target).toEqual({
      userId: 'owner-1',
      recipient: null,
      veterinaryId: 'vet-1',
      veterinaryName: 'Clínica Patitas',
    });
  });

  it('si la mascota no tiene dueño con cuenta usa el contacto (contrato §4.1, regla 1)', async () => {
    mockGetPets.mockResolvedValue(
      petWith({
        ownerId: null,
        claimStatus: 'UNCLAIMED',
        ownerContact: { name: 'Carlos', email: 'carlos@correo.com', phone: null },
      })
    );
    const target = await resolveEventTarget('pet-1', { veterinaryId: 'vet-1' });
    expect(target?.userId).toBeNull();
    expect(target?.recipient).toEqual({ name: 'Carlos', email: 'carlos@correo.com', phone: null });
  });

  it('sin dueño ni contacto deja recipient en null (el publisher lo rechazará)', async () => {
    mockGetPets.mockResolvedValue(petWith({ ownerId: null, claimStatus: 'UNCLAIMED', ownerContact: null }));
    const target = await resolveEventTarget('pet-1', { veterinaryId: null });
    expect(target?.userId).toBeNull();
    expect(target?.recipient).toBeNull();
    expect(mockGetVeterinaryName).not.toHaveBeenCalled();
  });

  it('si Pets no conoce la mascota devuelve null sin lanzar error', async () => {
    mockGetPets.mockResolvedValue(new Map());
    await expect(resolveEventTarget('pet-x', { veterinaryId: null })).resolves.toBeNull();
  });

  it('si Pets falla devuelve null: la respuesta HTTP no se rompe', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetPets.mockRejectedValue(new Error('timeout'));
    await expect(resolveEventTarget('pet-1', { veterinaryId: 'vet-1' })).resolves.toBeNull();
    errorSpy.mockRestore();
  });

  it('no incluye veterinaryName cuando el dueño actúa sin clínica', async () => {
    mockGetPets.mockResolvedValue(petWith({}));
    const target = await resolveEventTarget('pet-1', { veterinaryId: null });
    expect(target?.veterinaryName).toBeNull();
    expect(mockGetVeterinaryName).not.toHaveBeenCalled();
  });
});
