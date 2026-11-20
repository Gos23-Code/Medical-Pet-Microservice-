import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  NewPetAllergy,
  NewPetDeworming,
  PetAllergyRecord,
  PetClinicalProfile,
  PetDewormingRecord,
  PetHealthRepository,
  PetHealthTable,
  PetHealthVersionRow,
  emptyClinicalProfile,
} from '@/src/domain/repositories/pet-health.repository';
import {
  ApplyCorrectionInput,
  ClinicalCorrectionRepository,
  ClinicalVersion,
  CorrectableTable,
} from '@/src/domain/repositories/clinical-correction.repository';
import { ActRef } from '@/src/application/clinical/act-integrity';
import { ApiError } from '@/src/infrastructure/http/api-error';
import { RegisterAllergyUseCase } from '../register-allergy.use-case';
import { ConfirmAllergyUseCase } from '../confirm-allergy.use-case';
import { UpdatePetClinicalProfileUseCase } from '../update-pet-clinical-profile.use-case';
import { RecordDewormingUseCase } from '../record-deworming.use-case';
import { GetPetHealthUseCase } from '../get-pet-health.use-case';
import { PetHealthAuditPort, PetHealthWriter } from '../pet-health.shared';

const TODAY = '2026-11-19';
const PET = 'pet-1';
const NOW = '2026-11-19T10:00:00Z';

const owner: PetHealthWriter = { source: 'OWNER', veterinaryId: null, employeeId: null, userId: 'owner-1' };
const vetA: PetHealthWriter = { source: 'CLINIC', veterinaryId: 'vet-a', employeeId: 'emp-1', userId: 'emp-user-1' };
const vetB: PetHealthWriter = { source: 'CLINIC', veterinaryId: 'vet-b', employeeId: 'emp-9', userId: 'emp-user-9' };

/** Almacén compartido: filas, perfil y versiones. Las filas originales nunca cambian. */
class Store {
  allergies: PetAllergyRecord[] = [];
  dewormings: PetDewormingRecord[] = [];
  profiles = new Map<string, PetClinicalProfile>();
  versions: Array<PetHealthVersionRow & { table: PetHealthTable | CorrectableTable }> = [];
  audit: Array<{ tableName: string; action: string; actorUserId: string; changes?: Record<string, unknown> | null }> = [];
  private nextId = 1;

  newId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }
}

class FakeHealthRepository implements PetHealthRepository {
  constructor(private readonly store: Store) {}

  async insertAllergy(allergy: NewPetAllergy): Promise<string> {
    const id = this.store.newId('alg');
    this.store.allergies.push({ ...allergy, id, createdAt: NOW });
    return id;
  }
  async findAllergyById(id: string) {
    return this.store.allergies.find((a) => a.id === id) ?? null;
  }
  async findAllergiesByPet(petId: string) {
    return this.store.allergies.filter((a) => a.petId === petId);
  }
  async insertDeworming(deworming: NewPetDeworming): Promise<string> {
    const id = this.store.newId('dew');
    this.store.dewormings.push({ ...deworming, id, status: 'ACTIVE', createdAt: NOW });
    return id;
  }
  async findDewormingById(id: string) {
    return this.store.dewormings.find((d) => d.id === id) ?? null;
  }
  async findDewormingsByPet(petId: string) {
    return this.store.dewormings.filter((d) => d.petId === petId);
  }
  async findProfile(petId: string) {
    return this.store.profiles.get(petId) ?? null;
  }
  async saveProfile(profile: PetClinicalProfile) {
    this.store.profiles.set(profile.petId, profile);
  }
  async listVersions(table: PetHealthTable, recordIds: string[]): Promise<PetHealthVersionRow[]> {
    return this.store.versions
      .filter((v) => v.table === table && recordIds.includes(v.recordId))
      .map(({ table: _table, ...row }) => row);
  }
}

class FakeCorrections implements ClinicalCorrectionRepository {
  failAudit = false;
  constructor(private readonly store: Store) {}

  async getActRef(): Promise<ActRef | null> {
    return null;
  }
  async applyCorrection(input: ApplyCorrectionInput): Promise<number> {
    const existing = this.store.versions.filter((v) => v.table === input.table && v.recordId === input.recordId);
    const version = existing.length + 1;
    this.store.versions.push({
      table: input.table,
      recordId: input.recordId,
      version,
      values: input.values,
      authorUserId: input.authorUserId,
      veterinaryId: input.veterinaryId,
      authorRole: input.authorRole,
      createdAt: NOW,
    });
    return version;
  }
  async listVersions(): Promise<ClinicalVersion[]> {
    return [];
  }
}

class FakeAudit implements PetHealthAuditPort {
  constructor(private readonly store: Store) {}
  async record(entry: { tableName: string; action: 'CREATE' | 'UPDATE' | 'DELETE'; actorUserId: string; changes?: Record<string, unknown> | null }) {
    this.store.audit.push(entry);
  }
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('se esperaba un error y no se lanzó');
}

describe('datos clínicos de la mascota (casos de uso)', () => {
  let store: Store;
  let repo: FakeHealthRepository;
  let corrections: FakeCorrections;
  let audit: FakeAudit;

  beforeEach(() => {
    store = new Store();
    repo = new FakeHealthRepository(store);
    corrections = new FakeCorrections(store);
    audit = new FakeAudit(store);
  });

  describe('registrar alergia', () => {
    it('positivo: el dueño la declara como SUSPECTED y queda auditada', async () => {
      const result = await new RegisterAllergyUseCase(repo, audit).execute(PET, owner, { allergen: 'Penicilina', severity: 'SEVERE' });

      expect(result.status).toBe('SUSPECTED');
      expect(store.allergies[0]).toMatchObject({ source: 'OWNER', createdByUserId: 'owner-1', veterinaryId: null, status: 'SUSPECTED' });
      expect(store.audit).toHaveLength(1);
      expect(store.audit[0]).toMatchObject({ tableName: 'pet_allergies', action: 'CREATE' });
    });

    it('positivo: la clínica la registra ya CONFIRMED, con su clínica y empleado', async () => {
      const result = await new RegisterAllergyUseCase(repo, audit).execute(PET, vetA, { allergen: 'Pollo', severity: 'MILD' });

      expect(result.status).toBe('CONFIRMED');
      expect(store.allergies[0]).toMatchObject({ source: 'CLINIC', veterinaryId: 'vet-a', employeeId: 'emp-1', status: 'CONFIRMED' });
    });

    it('negativo: sin alérgeno → 400 y no se guarda nada', async () => {
      const error = await errorOf(new RegisterAllergyUseCase(repo, audit).execute(PET, owner, { severity: 'MILD' }));
      expect(error.status).toBe(400);
      expect(store.allergies).toHaveLength(0);
    });
  });

  describe('confirmar alergia', () => {
    async function declaredByOwner(): Promise<string> {
      const created = await new RegisterAllergyUseCase(repo, audit).execute(PET, owner, { allergen: 'Penicilina', severity: 'SEVERE' });
      return created.id;
    }

    it('positivo: una clínica confirma la declaración del dueño como versión; la fila original no cambia', async () => {
      const id = await declaredByOwner();
      const original = { ...store.allergies[0] };

      const result = await new ConfirmAllergyUseCase(repo, corrections, audit).execute(id, vetA);

      expect(result.version).toBe(1);
      expect(store.versions[0]).toMatchObject({ table: 'pet_allergies', values: { status: 'CONFIRMED' }, authorRole: 'CLINIC', veterinaryId: 'vet-a' });
      expect(store.allergies[0]).toEqual(original);
      expect(store.audit.at(-1)).toMatchObject({ action: 'UPDATE', changes: { status: { from: 'SUSPECTED', to: 'CONFIRMED' } } });
    });

    it('negativo: el dueño no puede confirmar lo suyo → 403 y nada cambia', async () => {
      const id = await declaredByOwner();
      const error = await errorOf(new ConfirmAllergyUseCase(repo, corrections, audit).execute(id, owner));
      expect(error).toMatchObject({ status: 403, code: 'OWNER_CANNOT_CONFIRM' });
      expect(store.versions).toHaveLength(0);
    });

    it('negativo: una alergia que la clínica registró no se "confirma" de nuevo → 403', async () => {
      const created = await new RegisterAllergyUseCase(repo, audit).execute(PET, vetA, { allergen: 'Pollo', severity: 'MILD' });
      const error = await errorOf(new ConfirmAllergyUseCase(repo, corrections, audit).execute(created.id, vetB));
      expect(error).toMatchObject({ status: 403, code: 'NOT_OWNER_DECLARED' });
    });

    it('negativo: confirmar dos veces (o después de otra clínica) → 409', async () => {
      const id = await declaredByOwner();
      await new ConfirmAllergyUseCase(repo, corrections, audit).execute(id, vetA);

      const error = await errorOf(new ConfirmAllergyUseCase(repo, corrections, audit).execute(id, vetB));
      expect(error).toMatchObject({ status: 409, code: 'ALLERGY_NOT_SUSPECTED' });
      expect(store.versions).toHaveLength(1);
    });

    it('negativo: alergia inexistente → 404', async () => {
      const error = await errorOf(new ConfirmAllergyUseCase(repo, corrections, audit).execute('no-existe', vetA));
      expect(error).toMatchObject({ status: 404, code: 'ALLERGY_NOT_FOUND' });
    });

    it('la vista muestra la confirmación con su autor y la alergia pasa a estar vigente', async () => {
      const id = await declaredByOwner();
      await new ConfirmAllergyUseCase(repo, corrections, audit).execute(id, vetA);

      const health = await new GetPetHealthUseCase(repo).execute(PET);
      expect(health.allergies[0]).toMatchObject({ status: 'CONFIRMED', isActive: true, correctionCount: 1 });
      expect(health.allergies[0].confirmedBy).toMatchObject({ userId: 'emp-user-1', veterinaryId: 'vet-a' });
      expect(health.allergyStatus).toBe('HAS_ALLERGIES');
    });
  });

  describe('estado de la mascota (alergias y esterilización)', () => {
    const update = (writer: PetHealthWriter, body: Record<string, unknown>) =>
      new UpdatePetClinicalProfileUseCase(repo, audit).execute(PET, writer, body, TODAY);

    it('positivo: el dueño declara que no tiene alergias conocidas y que está esterilizada', async () => {
      const profile = await update(owner, { allergyStatus: 'NONE_KNOWN', neuteredStatus: 'YES', neuteredAt: '2024-03-01' });

      expect(profile).toMatchObject({
        allergyStatus: 'NONE_KNOWN',
        allergyStatusSource: 'OWNER',
        neuteredStatus: 'YES',
        neuteredAt: '2024-03-01',
        neuteredSource: 'OWNER',
        neuteredConfirmedEmployeeId: null,
      });
      expect(store.audit.at(-1)).toMatchObject({ tableName: 'pet_clinical_profile', action: 'UPDATE' });
    });

    it('positivo: la clínica confirma la esterilización con su empleado', async () => {
      const profile = await update(vetA, { neuteredStatus: 'YES', neuteredAt: '2025-01-10' });
      expect(profile).toMatchObject({ neuteredSource: 'CLINIC', neuteredConfirmedEmployeeId: 'emp-1' });
      expect(profile.neuteredConfirmedAt).not.toBeNull();
    });

    it('positivo: si el dueño cambia el dato después de la clínica, la confirmación deja de valer', async () => {
      await update(vetA, { neuteredStatus: 'YES' });
      const profile = await update(owner, { neuteredStatus: 'NO' });
      expect(profile).toMatchObject({ neuteredStatus: 'NO', neuteredSource: 'OWNER', neuteredConfirmedEmployeeId: null, neuteredConfirmedAt: null });
    });

    it('negativo: NONE_KNOWN con alergias vigentes → 409', async () => {
      await new RegisterAllergyUseCase(repo, audit).execute(PET, owner, { allergen: 'Pollo', severity: 'MILD' });
      const error = await errorOf(update(owner, { allergyStatus: 'NONE_KNOWN' }));
      expect(error).toMatchObject({ status: 409, code: 'ACTIVE_ALLERGIES_EXIST' });
      expect(store.profiles.get(PET)).toBeUndefined();
    });

    it('negativo: declarar HAS_ALLERGIES a mano → 400', async () => {
      expect((await errorOf(update(owner, { allergyStatus: 'HAS_ALLERGIES' }))).status).toBe(400);
    });

    it('negativo: fecha de esterilización sin YES, futura o sin body útil → 400', async () => {
      expect((await errorOf(update(owner, { neuteredStatus: 'NO', neuteredAt: '2024-01-01' }))).status).toBe(400);
      expect((await errorOf(update(owner, { neuteredStatus: 'YES', neuteredAt: '2030-01-01' }))).status).toBe(400);
      expect((await errorOf(update(owner, {}))).code).toBe('NOTHING_TO_UPDATE');
    });

    it('sin declarar nada, el estado es UNKNOWN (nunca "sin alergias")', async () => {
      const health = await new GetPetHealthUseCase(repo).execute(PET);
      expect(health.allergyStatus).toBe('UNKNOWN');
      expect(health.neutered.status).toBe('UNKNOWN');
      expect(emptyClinicalProfile(PET).allergyStatus).toBe('UNKNOWN');
    });
  });

  describe('registrar desparasitación', () => {
    it('positivo: el dueño registra la fecha de la última dosis; no hay próxima dosis', async () => {
      const result = await new RecordDewormingUseCase(repo, audit).execute(PET, owner, { kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-11-10' }, TODAY);

      expect(result).toEqual({ id: store.dewormings[0].id });
      expect(store.dewormings[0]).toMatchObject({ source: 'OWNER', createdByUserId: 'owner-1', applicationDate: '2026-11-10' });
      expect(store.dewormings[0]).not.toHaveProperty('nextDoseDate');
    });

    it('positivo: la clínica registra la dosis con su empleado', async () => {
      await new RecordDewormingUseCase(repo, audit).execute(PET, vetA, { kind: 'EXTERNAL', product: 'Frontline', applicationDate: '2026-11-01' }, TODAY);
      expect(store.dewormings[0]).toMatchObject({ source: 'CLINIC', veterinaryId: 'vet-a', employeeId: 'emp-1' });
    });

    it('negativo: fecha de aplicación futura → 400 y no se guarda', async () => {
      const error = await errorOf(
        new RecordDewormingUseCase(repo, audit).execute(PET, owner, { kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-12-01' }, TODAY)
      );
      expect(error.status).toBe(400);
      expect(store.dewormings).toHaveLength(0);
    });
  });

  describe('resumen de desparasitación en la vista', () => {
    it('muestra la última dosis activa por tipo; si se marca como registrada por error, vuelve a SIN_REGISTRO', async () => {
      const record = new RecordDewormingUseCase(repo, audit);
      await record.execute(PET, owner, { kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-09-01' }, TODAY);
      await record.execute(PET, vetA, { kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-10-15' }, TODAY);

      let health = await new GetPetHealthUseCase(repo).execute(PET);
      expect(health.dewormings.INTERNAL).toEqual({ registered: true, lastApplicationDate: '2026-10-15' });
      expect(health.dewormings.EXTERNAL).toEqual({ registered: false, lastApplicationDate: null });

      await corrections.applyCorrection({
        table: 'pet_dewormings',
        recordId: store.dewormings[1].id,
        reason: 'Se registró en la mascota equivocada',
        values: { status: 'ENTERED_IN_ERROR' },
        authorUserId: 'emp-user-1',
        authorEmployeeId: 'emp-1',
        veterinaryId: 'vet-a',
        authorRole: 'CLINIC',
      });

      health = await new GetPetHealthUseCase(repo).execute(PET);
      expect(health.dewormings.INTERNAL).toEqual({ registered: true, lastApplicationDate: '2026-09-01' });
      expect(health.dewormingRecords[1]).toMatchObject({ status: 'ENTERED_IN_ERROR', correctionCount: 1 });
    });
  });
});
