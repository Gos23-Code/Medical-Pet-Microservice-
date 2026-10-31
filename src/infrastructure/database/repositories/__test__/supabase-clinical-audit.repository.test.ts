import { describe, it, expect, jest } from '@jest/globals';
import { SupabaseClinicalAuditRepository, buildChanges } from '../supabase-clinical-audit.repository';

// MED-05: cada escritura clínica deja rastro con antes/después de lo que cambió.

describe('buildChanges', () => {
  it('registra solo los campos que cambiaron, con antes y después', () => {
    expect(
      buildChanges(
        { diagnosis: 'pendiente', notes: 'igual' },
        { diagnosis: 'parvovirus', notes: 'igual' }
      )
    ).toEqual({ diagnosis: { from: 'pendiente', to: 'parvovirus' } });
  });

  it('ignora campos undefined (no se enviaron en la actualización)', () => {
    expect(buildChanges({ notes: 'a' }, { notes: undefined })).toEqual({});
  });

  it('marca como null el valor anterior ausente', () => {
    expect(buildChanges({}, { notes: 'nueva' })).toEqual({ notes: { from: null, to: 'nueva' } });
  });
});

describe('SupabaseClinicalAuditRepository.record', () => {
  it('inserta en clinical_audit_log con el actor y la clínica', async () => {
    const insert = jest.fn<(rows: unknown[]) => Promise<{ error: unknown }>>(async () => ({ error: null }));
    const from = jest.fn<(table: string) => { insert: typeof insert }>(() => ({ insert }));
    const repository = new SupabaseClinicalAuditRepository({ from } as never);

    await repository.record({
      tableName: 'veterinary_visits',
      recordId: 'visit-1',
      action: 'UPDATE',
      actorUserId: 'vet-user-1',
      veterinaryId: 'vet-1',
      changes: { diagnosis: { from: null, to: 'x' } },
    });

    expect(from).toHaveBeenCalledWith('clinical_audit_log');
    expect(insert).toHaveBeenCalledWith([
      {
        table_name: 'veterinary_visits',
        record_id: 'visit-1',
        action: 'UPDATE',
        actor_user_id: 'vet-user-1',
        veterinary_id: 'vet-1',
        changes: { diagnosis: { from: null, to: 'x' } },
      },
    ]);
  });

  it('si la auditoría falla solo registra el error, no lanza', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = new SupabaseClinicalAuditRepository({
      from: () => ({ insert: async () => ({ error: { message: 'boom' } }) }),
    } as never);

    await expect(
      repository.record({ tableName: 't', recordId: 'r', action: 'CREATE', actorUserId: 'u', veterinaryId: null })
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
