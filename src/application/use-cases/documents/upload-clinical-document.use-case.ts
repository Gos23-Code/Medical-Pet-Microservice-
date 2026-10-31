import { randomUUID } from 'crypto';
import { ClinicalDocument, ClinicalDocumentType } from '@/src/domain/entities/clinical-document.entity';
import { ClinicalDocumentRepository, DocumentStorage } from '@/src/domain/repositories/clinical-document.repository';
import { buildStoragePath, validateDocumentUpload } from './document-rules';

export interface UploadClinicalDocumentInput {
  petId: string;
  veterinaryId: string;
  uploadedByUserId: string;
  documentType: string;
  title: string;
  mimeType: string;
  bytes: Uint8Array;
  visitId?: string | null;
  surgeryId?: string | null;
  labTestId?: string | null;
}

/** Valida, sube el archivo al bucket privado y guarda sus metadatos. Si el registro falla, borra el archivo. */
export class UploadClinicalDocumentUseCase {
  constructor(
    private readonly repository: ClinicalDocumentRepository,
    private readonly storage: DocumentStorage,
    private readonly newId: () => string = randomUUID
  ) {}

  async execute(input: UploadClinicalDocumentInput): Promise<ClinicalDocument> {
    const validation = validateDocumentUpload({
      documentType: input.documentType,
      title: input.title,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
    });
    if (!validation.ok) {
      throw new DocumentValidationError(validation.message);
    }

    const id = this.newId();
    const storagePath = buildStoragePath({
      veterinaryId: input.veterinaryId,
      petId: input.petId,
      documentId: id,
      mimeType: input.mimeType,
    });

    await this.storage.upload(storagePath, input.bytes, input.mimeType);

    const document: ClinicalDocument = {
      id,
      petId: input.petId,
      visitId: input.visitId ?? null,
      surgeryId: input.surgeryId ?? null,
      labTestId: input.labTestId ?? null,
      documentType: input.documentType as ClinicalDocumentType,
      title: input.title.trim(),
      storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      source: 'CLINIC',
      veterinaryId: input.veterinaryId,
      uploadedByUserId: input.uploadedByUserId,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.repository.insert(document);
    } catch (error) {
      // Sin metadatos el archivo no se puede encontrar ni borrar desde la app: no lo dejamos huérfano
      await this.storage.remove(storagePath).catch((cleanupError) =>
        console.error('❌ No se pudo borrar el archivo huérfano:', storagePath, cleanupError)
      );
      throw error;
    }

    return document;
  }
}

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}
