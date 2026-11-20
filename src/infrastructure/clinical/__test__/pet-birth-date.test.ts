import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ApiError } from '@/src/infrastructure/http/api-error';
import { validateNeutering } from '@/src/application/clinical/pet-health/neutering-rules';

const mockGetPets = jest.fn<(ids: string[]) => Promise<Map<string, { birthDate?: string | null }>>>();
jest.mock('@/src/infrastructure/clients/pets.client', () => ({ getPets: (ids: string[]) => mockGetPets(ids) }));

import { petBirthDate } from '../pet-birth-date';

const TODAY = '2026-11-19';

describe('fecha de nacimiento desde Pets', () => {
  beforeEach(() => {
    mockGetPets.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('positivo: devuelve birthDate como YYYY-MM-DD (también si llega con hora)', async () => {
    mockGetPets.mockResolvedValue(new Map([['pet-1', { birthDate: '2024-05-01T00:00:00.000Z' }]]));
    await expect(petBirthDate('pet-1')).resolves.toBe('2024-05-01');
  });

  it('negativo: si Pets no envía birthDate, o la mascota no existe, devuelve null', async () => {
    mockGetPets.mockResolvedValueOnce(new Map([['pet-1', {}]]));
    await expect(petBirthDate('pet-1')).resolves.toBeNull();

    mockGetPets.mockResolvedValueOnce(new Map());
    await expect(petBirthDate('pet-2')).resolves.toBeNull();
  });

  it('negativo: fecha inválida o Pets caído → null (no rompe la operación)', async () => {
    mockGetPets.mockResolvedValueOnce(new Map([['pet-1', { birthDate: '2024-02-31' }]]));
    await expect(petBirthDate('pet-1')).resolves.toBeNull();

    mockGetPets.mockRejectedValueOnce(new Error('503'));
    await expect(petBirthDate('pet-1')).resolves.toBeNull();
  });
});

describe('esterilización contra la fecha de nacimiento', () => {
  it('positivo: una fecha posterior al nacimiento se acepta', () => {
    expect(validateNeutering('YES', '2025-01-10', TODAY, '2024-05-01').at).toBe('2025-01-10');
  });

  it('negativo: una fecha anterior al nacimiento → 400', () => {
    const run = () => validateNeutering('YES', '2023-01-10', TODAY, '2024-05-01');
    expect(run).toThrow(ApiError);
    expect(() => run()).toThrow('anterior a la fecha de nacimiento');
  });
});
