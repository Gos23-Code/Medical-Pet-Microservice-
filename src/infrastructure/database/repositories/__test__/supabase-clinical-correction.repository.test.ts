import { describe, it, expect, jest } from '@jest/globals';
import { SupabaseClinicalCorrectionRepository } from '../supabase-clinical-correction.repository';
import { CORRECTABLE_TABLES } from '@/src/domain/repositories/clinical-correction.repository';

// Cliente de Supabase simulado: captura las columnas pedidas y las llamadas a la función SQL.
function fakeClient(row: Record<string, unknown> | null) {
  const selected: string[] = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const builder = {
    select: jest.fn((columns: string) => {
      selected.push(columns);
      return builder;
    }),
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(async () => ({ data: row, error: null })),
  };
  const client = {
    from: jest.fn(() => builder),
    rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { data: 3, error: null };
    }),
  };
  return { client, selected, rpcCalls };
}

describe('SupabaseClinicalCorrectionRepository', () => {
  it('lee la autoría de WeightRecord con sus columnas PascalCase', async () => {
    const { client, selected } = fakeClient({ Source: 'OWNER', VeterinaryId: null, RegisteredByUserId: 'owner-1' });
    const repo = new SupabaseClinicalCorrectionRepository(client as never);

    const act = await repo.getActRef('WeightRecord', 'w-1');

    expect(selected[0]).toBe('Source, VeterinaryId, RegisteredByUserId');
    expect(act).toEqual({ source: 'OWNER', veterinaryId: null, createdByUserId: 'owner-1' });
  });

  it('lee la autoría de las demás tablas con snake_case', async () => {
    for (const table of CORRECTABLE_TABLES.filter((t) => t !== 'WeightRecord')) {
      const { client, selected } = fakeClient({ source: 'CLINIC', veterinary_id: 'vet-a', created_by_user_id: 'emp-1' });
      const repo = new SupabaseClinicalCorrectionRepository(client as never);

      const act = await repo.getActRef(table, 'r-1');

      expect(selected[0]).toBe('source, veterinary_id, created_by_user_id');
      expect(act).toEqual({ source: 'CLINIC', veterinaryId: 'vet-a', createdByUserId: 'emp-1' });
    }
  });

  it('devuelve null si el acto no existe', async () => {
    const { client } = fakeClient(null);
    const repo = new SupabaseClinicalCorrectionRepository(client as never);
    await expect(repo.getActRef('vaccines', 'no-existe')).resolves.toBeNull();
  });

  it('aplica la corrección con la función SQL y los datos del token (no del body)', async () => {
    const { client, rpcCalls } = fakeClient(null);
    const repo = new SupabaseClinicalCorrectionRepository(client as never);

    const version = await repo.applyCorrection({
      table: 'treatments',
      recordId: 't-1',
      reason: 'Dosis ajustada',
      values: { notes: 'nuevo' },
      authorUserId: 'emp-user-1',
      authorEmployeeId: 'emp-1',
      veterinaryId: 'vet-a',
      authorRole: 'CLINIC',
    });

    expect(version).toBe(3);
    expect(rpcCalls[0]).toEqual({
      fn: 'apply_clinical_correction',
      args: {
        p_table: 'treatments',
        p_record_id: 't-1',
        p_reason: 'Dosis ajustada',
        p_values: { notes: 'nuevo' },
        p_author_user_id: 'emp-user-1',
        p_author_employee_id: 'emp-1',
        p_veterinary_id: 'vet-a',
        p_author_role: 'CLINIC',
      },
    });
  });
});
