import { describe, it, expect, beforeEach } from '@jest/globals';
import { ApplyClinicalCorrectionUseCase } from '../apply-clinical-correction.use-case';
import {
  ApplyCorrectionInput,
  ClinicalCorrectionRepository,
  ClinicalVersion,
  CORRECTABLE_TABLES,
  CorrectableTable,
} from '@/src/domain/repositories/clinical-correction.repository';
import { ActRef } from '@/src/application/clinical/act-integrity';

const RECORD = 'rec-1';
const VET_A = 'vet-a';
const VET_B = 'vet-b';
const OWNER = 'owner-1';

const clinicAct: ActRef = { source: 'CLINIC', veterinaryId: VET_A, createdByUserId: 'emp-user-1' };
const ownerAct: ActRef = { source: 'OWNER', veterinaryId: null, createdByUserId: OWNER };

/**
 * Repositorio falso con transacción simulada. Las filas originales se guardan una vez y nunca cambian:
 * el fake no tiene método de UPDATE. Si la auditoría falla, no queda versión (ROLLBACK).
 */
class FakeCorrectionRepository implements ClinicalCorrectionRepository {
  versions: Array<ApplyCorrectionInput & { version: number }> = [];
  acts: Record<string, ActRef> = {};
  originals: Record<string, string> = {};
  auditFails = false;
  applyCalls = 0;

  async getActRef(_table: CorrectableTable, recordId: string): Promise<ActRef | null> {
    return this.acts[recordId] ?? null;
  }

  async applyCorrection(input: ApplyCorrectionInput): Promise<number> {
    this.applyCalls += 1;
    if (this.auditFails) {
      throw new Error('audit insert failed');
    }
    const version = this.versions.length + 1;
    this.versions.push({ ...input, version });
    return version;
  }

  async listVersions(_table: CorrectableTable, recordId: string): Promise<ClinicalVersion[]> {
    return this.versions
      .filter((v) => v.recordId === recordId)
      .map((v) => ({
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

describe('ApplyClinicalCorrectionUseCase', () => {
  let repo: FakeCorrectionRepository;
  let useCase: ApplyClinicalCorrectionUseCase;

  beforeEach(() => {
    repo = new FakeCorrectionRepository();
    repo.acts[RECORD] = clinicAct;
    repo.originals[RECORD] = JSON.stringify(clinicAct);
    useCase = new ApplyClinicalCorrectionUseCase(repo);
  });

  const cmd = (table: CorrectableTable, overrides: Partial<Parameters<ApplyClinicalCorrectionUseCase['execute']>[0]> = {}) => ({
    table,
    recordId: RECORD,
    actor: { userId: 'emp-user-1', veterinaryId: VET_A },
    reason: 'Dato mal registrado',
    values: { note: 'corregido' },
    employeeId: 'emp-1',
    ...overrides,
  });

  describe.each(CORRECTABLE_TABLES)('tabla %s', (table) => {
    it('positivo: el veterinario autor corrige con motivo → se crea una versión y la original queda igual', async () => {
      const result = await useCase.execute(cmd(table));

      expect(result).toEqual({ version: 1 });
      expect(repo.versions).toHaveLength(1);
      expect(repo.versions[0]).toMatchObject({ table, recordId: RECORD, reason: 'Dato mal registrado', authorRole: 'CLINIC' });
      expect(repo.acts[RECORD]).toEqual(clinicAct);
      expect(JSON.stringify(repo.acts[RECORD])).toBe(repo.originals[RECORD]);
    });

    it('positivo: otro veterinario de la MISMA clínica puede corregir', async () => {
      await useCase.execute(cmd(table, { actor: { userId: 'emp-user-9', veterinaryId: VET_A } }));
      expect(repo.versions).toHaveLength(1);
    });

    it('positivo: el dueño corrige un acto que registró él (rol OWNER, sin clínica)', async () => {
      repo.acts[RECORD] = ownerAct;
      await useCase.execute(cmd(table, { actor: { userId: OWNER, veterinaryId: null }, employeeId: null }));
      expect(repo.versions[0]).toMatchObject({ authorRole: 'OWNER', veterinaryId: null, authorEmployeeId: null });
    });

    it('negativo: el propietario NO puede corregir un acto de un veterinario → 403', async () => {
      await expect(
        useCase.execute(cmd(table, { actor: { userId: OWNER, veterinaryId: null }, employeeId: null }))
      ).rejects.toMatchObject({ status: 403, code: 'OWNER_CANNOT_CORRECT_CLINIC_ACT' });
      expect(repo.versions).toHaveLength(0);
    });

    it('negativo: la clínica B NO puede corregir un acto de la clínica A → 403', async () => {
      await expect(
        useCase.execute(cmd(table, { actor: { userId: 'emp-user-9', veterinaryId: VET_B } }))
      ).rejects.toMatchObject({ status: 403, code: 'OTHER_CLINIC_ACT' });
      expect(repo.versions).toHaveLength(0);
    });

    it('negativo: la clínica no puede corregir un acto que registró el dueño → 403', async () => {
      repo.acts[RECORD] = ownerAct;
      await expect(useCase.execute(cmd(table))).rejects.toMatchObject({ status: 403, code: 'NOT_CLINIC_ACT' });
      expect(repo.versions).toHaveLength(0);
    });

    it('negativo: corregir sin motivo → 400 y no se escribe nada', async () => {
      await expect(useCase.execute(cmd(table, { reason: undefined }))).rejects.toMatchObject({
        status: 400,
        code: 'REASON_REQUIRED',
      });
      expect(repo.applyCalls).toBe(0);
    });

    it('negativo: si la auditoría falla, la corrección no se guarda', async () => {
      repo.auditFails = true;
      await expect(useCase.execute(cmd(table))).rejects.toThrow('audit insert failed');
      expect(repo.versions).toHaveLength(0);
    });

    it('negativo: acto inexistente → 404', async () => {
      await expect(useCase.execute(cmd(table, { recordId: 'no-existe' }))).rejects.toMatchObject({ status: 404 });
    });
  });

  it('negativo: tabla fuera de la lista de actos corregibles → 400', async () => {
    await expect(useCase.execute(cmd('users' as CorrectableTable))).rejects.toMatchObject({
      status: 400,
      code: 'TABLE_NOT_CORRECTABLE',
    });
  });

  it('positivo: dos correcciones del mismo acto crean versiones 1 y 2, sin tocar la original', async () => {
    await useCase.execute(cmd('vaccines', { reason: 'Primera corrección' }));
    await useCase.execute(cmd('vaccines', { reason: 'Segunda corrección' }));

    expect(repo.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(JSON.stringify(repo.acts[RECORD])).toBe(repo.originals[RECORD]);
  });
});
