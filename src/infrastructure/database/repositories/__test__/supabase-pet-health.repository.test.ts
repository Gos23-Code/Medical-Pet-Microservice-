import { describe, it, expect, jest } from '@jest/globals';
import { SupabasePetHealthRepository } from '../supabase-pet-health.repository';

// Cliente de Supabase simulado: captura tabla, columnas, filtros, inserts y upserts.
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  const chain = (method: string) =>
    jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  Object.assign(builder, {
    select: chain('select'),
    eq: chain('eq'),
    in: chain('in'),
    order: chain('order'),
    insert: chain('insert'),
    upsert: chain('upsert'),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  });
  const client = {
    from: jest.fn((table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    }),
  };
  return { client, calls };
}

describe('SupabasePetHealthRepository', () => {
  it('insertAllergy escribe las columnas en snake_case y devuelve el id', async () => {
    const { client, calls } = fakeClient({ data: { id: 'alg-1' }, error: null });
    const repo = new SupabasePetHealthRepository(client as never);

    const id = await repo.insertAllergy({
      petId: 'pet-1',
      allergen: 'Penicilina',
      category: 'DRUG',
      reaction: null,
      severity: 'SEVERE',
      status: 'SUSPECTED',
      notes: null,
      source: 'OWNER',
      createdByUserId: 'owner-1',
      veterinaryId: null,
      employeeId: null,
    });

    expect(id).toBe('alg-1');
    expect(calls.find((c) => c.method === 'from')?.args).toEqual(['pet_allergies']);
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({
      pet_id: 'pet-1',
      created_by_user_id: 'owner-1',
      source: 'OWNER',
    });
  });

  it('insertAllergy lanza error si Supabase falla (la alergia no se da por guardada)', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'violates row-level security' } });
    const repo = new SupabasePetHealthRepository(client as never);
    await expect(
      repo.insertAllergy({
        petId: 'p', allergen: 'x', category: 'OTHER', reaction: null, severity: 'MILD', status: 'SUSPECTED',
        notes: null, source: 'OWNER', createdByUserId: 'o', veterinaryId: null, employeeId: null,
      })
    ).rejects.toThrow('violates row-level security');
  });

  it('findAllergiesByPet convierte las columnas a camelCase', async () => {
    const row = {
      id: 'alg-1', pet_id: 'pet-1', allergen: 'Pollo', category: 'FOOD', reaction: 'Vómito', severity: 'MILD',
      status: 'CONFIRMED', notes: null, source: 'CLINIC', created_by_user_id: 'emp-user-1',
      veterinary_id: 'vet-a', employee_id: 'emp-1', created_at: '2026-11-19T10:00:00Z',
    };
    const { client } = fakeClient({ data: [row], error: null });
    const repo = new SupabasePetHealthRepository(client as never);

    const [allergy] = await repo.findAllergiesByPet('pet-1');
    expect(allergy).toMatchObject({ petId: 'pet-1', createdByUserId: 'emp-user-1', veterinaryId: 'vet-a', employeeId: 'emp-1' });
  });

  it('findDewormingsByPet convierte el peso a número', async () => {
    const row = {
      id: 'dew-1', pet_id: 'pet-1', kind: 'INTERNAL', product: 'Drontal', active_ingredient: null, dose: null,
      weight_kg: '4.20', application_date: '2026-10-01', notes: null, status: 'ACTIVE', source: 'OWNER',
      created_by_user_id: 'owner-1', veterinary_id: null, employee_id: null, created_at: '2026-11-19T10:00:00Z',
    };
    const { client } = fakeClient({ data: [row], error: null });
    const repo = new SupabasePetHealthRepository(client as never);

    const [dewormings] = await repo.findDewormingsByPet('pet-1');
    expect(dewormings.weightKg).toBe(4.2);
  });

  it('saveProfile hace upsert por pet_id', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    const repo = new SupabasePetHealthRepository(client as never);

    await repo.saveProfile({
      petId: 'pet-1', allergyStatus: 'NONE_KNOWN', allergyStatusSource: 'OWNER', allergyStatusUserId: 'owner-1',
      allergyStatusVeterinaryId: null, neuteredStatus: 'YES', neuteredAt: '2024-03-01', neuteredSource: 'OWNER',
      neuteredUserId: 'owner-1', neuteredVeterinaryId: null, neuteredConfirmedEmployeeId: null, neuteredConfirmedAt: null,
    });

    const upsert = calls.find((c) => c.method === 'upsert');
    expect(upsert?.args[1]).toEqual({ onConflict: 'pet_id' });
    expect(upsert?.args[0]).toMatchObject({ pet_id: 'pet-1', neutered_status: 'YES', neutered_at: '2024-03-01' });
  });

  it('listVersions filtra por tabla y por los ids pedidos; sin ids no consulta', async () => {
    const { client, calls } = fakeClient({
      data: [{ record_id: 'alg-1', version: 1, values: { status: 'CONFIRMED' }, author_user_id: 'emp-user-1', veterinary_id: 'vet-a', author_role: 'CLINIC', created_at: 'x' }],
      error: null,
    });
    const repo = new SupabasePetHealthRepository(client as never);

    const versions = await repo.listVersions('pet_allergies', ['alg-1']);
    expect(calls.find((c) => c.method === 'in')?.args).toEqual(['record_id', ['alg-1']]);
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['record_table', 'pet_allergies']);
    expect(versions[0]).toMatchObject({ recordId: 'alg-1', authorUserId: 'emp-user-1', values: { status: 'CONFIRMED' } });

    const { client: idle, calls: idleCalls } = fakeClient({ data: [], error: null });
    await expect(new SupabasePetHealthRepository(idle as never).listVersions('pet_allergies', [])).resolves.toEqual([]);
    expect(idleCalls).toHaveLength(0);
  });
});
