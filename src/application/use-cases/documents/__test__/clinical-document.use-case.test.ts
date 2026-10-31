import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ClinicalDocument } from '@/src/domain/entities/clinical-document.entity';
import { ClinicalDocumentRepository, DocumentStorage } from '@/src/domain/repositories/clinical-document.repository';
import { UploadClinicalDocumentUseCase, DocumentValidationError } from '../upload-clinical-document.use-case';
import {
  ReadClinicalDocumentUseCase,
  DeleteClinicalDocumentUseCase,
  DocumentForbiddenError,
} from '../list-read-delete-clinical-document.use-case';
import { validateDocumentUpload, buildStoragePath, MAX_DOCUMENT_BYTES, SIGNED_URL_TTL_SECONDS } from '../document-rules';

// Módulo de documentos: exclusivo de la veterinaria. Se prueban las reglas y los casos con repo y storage falsos.

const VET = 'vet-1';
const OTHER_VET = 'vet-2';
const PET = 'pet-1';

function fakeRepo(initial: ClinicalDocument[] = []) {
  const rows = new Map(initial.map((d) => [d.id, d]));
  const repo: jest.Mocked<ClinicalDocumentRepository> = {
    insert: jest.fn(async (d: ClinicalDocument) => { rows.set(d.id, d); }),
    findById: jest.fn(async (id: string) => rows.get(id) ?? null),
    listByPet: jest.fn(async (petId: string) => [...rows.values()].filter((d) => d.petId === petId)),
    delete: jest.fn(async (id: string) => { rows.delete(id); }),
  };
  return { repo, rows };
}

function fakeStorage(): jest.Mocked<DocumentStorage> {
  return {
    upload: jest.fn(async () => undefined),
    createSignedUrl: jest.fn(async (path: string) => `https://signed.example/${path}?t=600`),
    remove: jest.fn(async () => undefined),
  };
}

const doc = (overrides: Partial<ClinicalDocument> = {}): ClinicalDocument => ({
  id: 'doc-1',
  petId: PET,
  visitId: null,
  surgeryId: null,
  labTestId: null,
  documentType: 'LABORATORIO',
  title: 'Resultado de laboratorio',
  storagePath: `clinics/${VET}/pets/${PET}/doc-1.pdf`,
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  source: 'CLINIC',
  veterinaryId: VET,
  uploadedByUserId: 'user-1',
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

const pdfBytes = (size = 100) => new Uint8Array(size);

describe('validateDocumentUpload (reglas del diseño)', () => {
  const base = { documentType: 'LABORATORIO', title: 'Examen', mimeType: 'application/pdf', sizeBytes: 100 };

  it('acepta PDF, JPG y PNG', () => {
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png']) {
      expect(validateDocumentUpload({ ...base, mimeType })).toEqual({ ok: true });
    }
  });

  it('rechaza otros formatos', () => {
    expect(validateDocumentUpload({ ...base, mimeType: 'application/zip' }).ok).toBe(false);
  });

  it('rechaza más de 10 MB', () => {
    expect(validateDocumentUpload({ ...base, sizeBytes: MAX_DOCUMENT_BYTES + 1 }).ok).toBe(false);
    expect(validateDocumentUpload({ ...base, sizeBytes: MAX_DOCUMENT_BYTES }).ok).toBe(true);
  });

  it('rechaza un tipo de documento que no está en el mockup', () => {
    expect(validateDocumentUpload({ ...base, documentType: 'RECETA' }).ok).toBe(false);
  });

  it('rechaza título vacío y archivo vacío', () => {
    expect(validateDocumentUpload({ ...base, title: '   ' }).ok).toBe(false);
    expect(validateDocumentUpload({ ...base, sizeBytes: 0 }).ok).toBe(false);
  });
});

describe('buildStoragePath', () => {
  it('ubica el archivo por clínica y mascota, con la extensión del tipo', () => {
    expect(buildStoragePath({ veterinaryId: VET, petId: PET, documentId: 'd1', mimeType: 'image/png' }))
      .toBe(`clinics/${VET}/pets/${PET}/d1.png`);
  });
});

describe('UploadClinicalDocumentUseCase', () => {
  let storage: jest.Mocked<DocumentStorage>;

  beforeEach(() => {
    storage = fakeStorage();
  });

  it('sube el archivo y guarda los metadatos con la clínica y el autor', async () => {
    const { repo, rows } = fakeRepo();
    const useCase = new UploadClinicalDocumentUseCase(repo, storage, () => 'doc-new');

    const result = await useCase.execute({
      petId: PET, veterinaryId: VET, uploadedByUserId: 'user-1',
      documentType: 'CONSENTIMIENTO', title: 'Consentimiento de cirugía',
      mimeType: 'application/pdf', bytes: pdfBytes(2048), surgeryId: 'surg-1',
    });

    expect(result).toMatchObject({
      id: 'doc-new', petId: PET, veterinaryId: VET, uploadedByUserId: 'user-1',
      source: 'CLINIC', sizeBytes: 2048, surgeryId: 'surg-1', visitId: null,
      storagePath: `clinics/${VET}/pets/${PET}/doc-new.pdf`,
    });
    expect(storage.upload).toHaveBeenCalledWith(`clinics/${VET}/pets/${PET}/doc-new.pdf`, expect.any(Uint8Array), 'application/pdf');
    expect(rows.get('doc-new')).toBeDefined();
  });

  it('no sube nada si la validación falla', async () => {
    const { repo } = fakeRepo();
    const useCase = new UploadClinicalDocumentUseCase(repo, storage, () => 'x');

    await expect(useCase.execute({
      petId: PET, veterinaryId: VET, uploadedByUserId: 'u', documentType: 'OTRO',
      title: 'Grande', mimeType: 'application/pdf', bytes: pdfBytes(MAX_DOCUMENT_BYTES + 1),
    })).rejects.toBeInstanceOf(DocumentValidationError);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('si la base falla, borra el archivo subido para no dejar huérfanos', async () => {
    const { repo } = fakeRepo();
    repo.insert.mockRejectedValueOnce(new Error('db caída'));
    const useCase = new UploadClinicalDocumentUseCase(repo, storage, () => 'doc-x');

    await expect(useCase.execute({
      petId: PET, veterinaryId: VET, uploadedByUserId: 'u', documentType: 'OTRO',
      title: 'Archivo', mimeType: 'image/jpeg', bytes: pdfBytes(10),
    })).rejects.toThrow('db caída');

    expect(storage.remove).toHaveBeenCalledWith(`clinics/${VET}/pets/${PET}/doc-x.jpg`);
  });
});

describe('ReadClinicalDocumentUseCase', () => {
  it('devuelve URL firmada de 10 minutos cuando la autorización pasa', async () => {
    const { repo } = fakeRepo([doc()]);
    const storage = fakeStorage();
    const authorize = jest.fn<(petId: string) => Promise<unknown>>(async () => ({ ok: true }));

    const result = await new ReadClinicalDocumentUseCase(repo, storage).execute('doc-1', authorize);

    expect(authorize).toHaveBeenCalledWith(PET);
    expect(result?.url).toContain('doc-1.pdf');
    expect(result?.expiresInSeconds).toBe(SIGNED_URL_TTL_SECONDS);
    expect(SIGNED_URL_TTL_SECONDS).toBe(600);
  });

  it('si la autorización falla, no firma ninguna URL', async () => {
    const { repo } = fakeRepo([doc()]);
    const storage = fakeStorage();
    const authorize = jest.fn<(petId: string) => Promise<unknown>>(async () => { throw new Error('403'); });

    await expect(new ReadClinicalDocumentUseCase(repo, storage).execute('doc-1', authorize)).rejects.toThrow('403');
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it('devuelve null si el documento no existe', async () => {
    const { repo } = fakeRepo();
    expect(await new ReadClinicalDocumentUseCase(repo, fakeStorage()).execute('nope', jest.fn<(petId: string) => Promise<unknown>>())).toBeNull();
  });
});

describe('DeleteClinicalDocumentUseCase', () => {
  it('borra metadatos y archivo cuando la clínica es la que lo subió', async () => {
    const { repo, rows } = fakeRepo([doc()]);
    const storage = fakeStorage();

    const deleted = await new DeleteClinicalDocumentUseCase(repo, storage).execute('doc-1', VET, jest.fn<(petId: string) => Promise<unknown>>(async () => ({})));

    expect(deleted).toBe(true);
    expect(rows.has('doc-1')).toBe(false);
    expect(storage.remove).toHaveBeenCalledWith(`clinics/${VET}/pets/${PET}/doc-1.pdf`);
  });

  it('otra clínica no puede borrar el documento (aunque vea la mascota)', async () => {
    const { repo, rows } = fakeRepo([doc()]);
    const storage = fakeStorage();

    await expect(
      new DeleteClinicalDocumentUseCase(repo, storage).execute('doc-1', OTHER_VET, jest.fn<(petId: string) => Promise<unknown>>(async () => ({})))
    ).rejects.toBeInstanceOf(DocumentForbiddenError);

    expect(rows.has('doc-1')).toBe(true);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('devuelve false si el documento no existe', async () => {
    const { repo } = fakeRepo();
    expect(await new DeleteClinicalDocumentUseCase(repo, fakeStorage()).execute('nope', VET, jest.fn<(petId: string) => Promise<unknown>>())).toBe(false);
  });
});
